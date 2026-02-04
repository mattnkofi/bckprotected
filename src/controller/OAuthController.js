const { OAuth2Client } = require('google-auth-library');
const { User } = require('../model');
const jwtService = require('../services/JwtService');
const { getDeviceInfo } = require('../middleware/AuthMiddleware');

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // http://localhost:5000/auth/google/callback
);

/**
 * Sets the same secure refresh cookie used in AuthController
 */
const setRefreshCookie = (res, token) => {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        path: '/api/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

exports.getGoogleAuthUrl = (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
        prompt: 'select_account'
    });
    res.json({ authUrl: url });
};

exports.exchangeGoogleCode = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Code is required' });

        // 1. Verify Google Code
        const { tokens } = await client.getToken(code);
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { email, name, sub: provider_id, picture } = ticket.getPayload();

        // 2. Sync User in DB
        let [user, created] = await User.findOrCreate({
            where: { email },
            defaults: {
                name: name,
                provider: 'google',
                provider_id: provider_id,
                avatar_url: picture,
                email_verified_at: new Date(),
                role: 'player'
            }
        });

        // If user existed but was local, link to Google
        if (!created && !user.provider_id) {
            await user.update({
                provider: 'google',
                provider_id: provider_id,
                email_verified_at: user.email_verified_at || new Date()
            });
        }

        // 3. Issue internal App Tokens
        const deviceInfo = getDeviceInfo(req);
        const appTokens = await jwtService.issueTokens(user, deviceInfo);

        // 4. Set Refresh Cookie
        setRefreshCookie(res, appTokens.refreshToken);

        res.json({
            message: 'Google login successful',
            token: appTokens.accessToken,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Google OAuth Exchange Error:', error);
        res.status(401).json({ message: 'Authentication with Google failed.' });
    }
};