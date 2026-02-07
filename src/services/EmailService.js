// src/services/EmailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: process.env.MAIL_PORT == 465,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        // Configuration from environment variables
        this.config = {
            websiteName: process.env.WEBSITE_NAME || 'Maestro',
            supportEmail: process.env.SUPPORT_EMAIL || process.env.MAIL_FROM_ADDRESS,
            logoUrl: process.env.EMAIL_LOGO_URL || '', // Optional SVG logo URL
            primaryColor: '#ec4899',
            accentColor: '#7e22ce',
            textColor: '#1c1b1d',
            lightGrayColor: '#fdfdfd',
        };
    }

    /**
     * Generic sender
     */
    async sendEmail({ to, subject, html }) {
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to,
            subject,
            html,
        };

        return await this.transporter.sendMail(mailOptions);
    }

    /**
     * Generate email wrapper with header and footer
     */
    getEmailTemplate(content, subject = '') {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
                        line-height: 1.6;
                        color: ${this.config.textColor};
                        background-color: #f5f5f5;
                    }
                    .email-wrapper {
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    .email-header {
                        background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                        padding: 40px 20px;
                        text-align: center;
                        color: #ffffff;
                    }
                    .logo {
                        height: 50px;
                        margin-bottom: 15px;
                    }
                    .header-title {
                        font-size: 28px;
                        font-weight: 700;
                        margin: 0;
                        letter-spacing: -0.5px;
                    }
                    .email-body {
                        padding: 40px 30px;
                    }
                    .email-footer {
                        background-color: ${this.config.lightGrayColor};
                        padding: 30px;
                        border-top: 1px solid #e5e5e5;
                        text-align: center;
                        font-size: 12px;
                        color: #666666;
                    }
                    .footer-divider {
                        height: 1px;
                        background-color: #e5e5e5;
                        margin: 20px 0;
                    }
                    .system-notice {
                        font-style: italic;
                        color: #999999;
                        margin-top: 15px;
                        font-size: 11px;
                    }
                    h1, h2, h3 {
                        color: ${this.config.textColor};
                        margin-bottom: 15px;
                        line-height: 1.4;
                    }
                    h1 {
                        font-size: 24px;
                        font-weight: 700;
                    }
                    h2 {
                        font-size: 20px;
                        font-weight: 600;
                    }
                    p {
                        margin-bottom: 15px;
                        font-size: 14px;
                        line-height: 1.8;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: ${this.config.primaryColor};
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        font-size: 14px;
                        margin: 20px 0;
                        transition: background-color 0.3s ease;
                    }
                    .button:hover {
                        background-color: #05b44e;
                    }
                    .button-secondary {
                        background-color: ${this.config.accentColor};
                    }
                    .button-secondary:hover {
                        background-color: #ea580c;
                    }
                    .highlight-box {
                        background-color: ${this.config.lightGrayColor};
                        border-left: 4px solid ${this.config.primaryColor};
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .info-text {
                        font-size: 13px;
                        color: #666666;
                        margin-top: 10px;
                    }
                    .accent-text {
                        color: ${this.config.accentColor};
                        font-weight: 600;
                    }
                    .divider {
                        border: none;
                        border-top: 1px solid #e5e5e5;
                        margin: 30px 0;
                    }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="email-header">
                        ${this.config.logoUrl ? `<img src="${this.config.logoUrl}" alt="${this.config.websiteName}" class="logo" />` : ''}
                        <h1 class="header-title">${this.config.websiteName}</h1>
                    </div>
                    <div class="email-body">
                        ${content}
                    </div>
                    <div class="email-footer">
                        <p><strong>${this.config.websiteName}</strong></p>
                        <p>Email: <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">${this.config.supportEmail}</a></p>
                        <div class="footer-divider"></div>
                        <p class="system-notice">✓ This is a system-generated email. Please do not reply directly to this message.</p>
                        <p class="system-notice">© ${new Date().getFullYear()} ${this.config.websiteName}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Feature: Email Verification
     */
    async sendVerificationEmail(user, token) {
        const verificationUrl = `${process.env.FRONTEND_URL}/account/verify-email?token=${token}&email=${user.email}`;
        const expirationTime = '24 hours';

        const content = `
            <h1>Welcome to ${this.config.websiteName}! 🎉</h1>
            <p>Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>Thank you for signing up! To complete your registration and secure your account, please verify your email address.</p>

            <div class="highlight-box">
                <p>Verification is required to:</p>
                <ul style="margin-left: 20px; margin-bottom: 0;">
                    <li>Activate your account</li>
                    <li>Ensure email delivery for important notifications</li>
                    <li>Protect your account security</li>
                </ul>
            </div>

            <p style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>

            <p class="info-text">Or copy and paste this link in your browser:</p>
            <p class="info-text" style="word-break: break-all; background-color: ${this.config.lightGrayColor}; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
            </p>

            <p class="info-text"><span class="accent-text">⏰ Important:</span> This verification link expires in <strong>${expirationTime}</strong>. If you didn't create this account, you can safely ignore this email.</p>

            <hr class="divider">

            <p>If you need help, contact our support team at <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">${this.config.supportEmail}</a></p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Verify your ${this.config.websiteName} email - Action required`,
            html: this.getEmailTemplate(content, `Verify your ${this.config.websiteName} email`),
        });
    }

    /**
     * Feature: Password Reset
     */
    async sendPasswordResetEmail(user, token) {
        const resetUrl = `${process.env.FRONTEND_URL}/account/reset-password?token=${token}&email=${user.email}`;
        const expirationTime = '1 hour';

        const content = `
            <h1>Password Reset Request 🔐</h1>
            <p>Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>We received a request to reset the password for your ${this.config.websiteName} account. If you made this request, click the button below to create a new password.</p>

            <div class="highlight-box">
                <p style="margin: 0;"><strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email or <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">contact our support team</a> immediately.</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Your Password</a>
            </p>

            <p class="info-text">Or copy and paste this link in your browser:</p>
            <p class="info-text" style="word-break: break-all; background-color: ${this.config.lightGrayColor}; padding: 10px; border-radius: 4px;">
                ${resetUrl}
            </p>

            <h3>What happens next:</h3>
            <ol style="margin-left: 20px; margin-bottom: 15px;">
                <li>Click the button above or copy the link</li>
                <li>Enter and confirm your new password</li>
                <li>You'll be signed back in automatically</li>
            </ol>

            <p class="info-text"><span class="accent-text">⏰ Important:</span> This reset link expires in <strong>${expirationTime}</strong>. For security reasons, we can only process one reset request at a time.</p>

            <hr class="divider">

            <p><strong>Account Security Tips:</strong></p>
            <ul style="margin-left: 20px; margin-bottom: 15px; font-size: 13px; color: #666666;">
                <li>Use a strong, unique password (mix of uppercase, lowercase, numbers, and symbols)</li>
                <li>Never share your password with anyone</li>
                <li>Verify sender email before clicking links in similar emails</li>
            </ul>

            <p>Need assistance? Contact our support team at <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">${this.config.supportEmail}</a></p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Reset your ${this.config.websiteName} password - Secure link inside`,
            html: this.getEmailTemplate(content, `Reset your ${this.config.websiteName} password`),
        });
    }

    /**
     * Feature: Welcome Email (after successful verification)
     */
    async sendWelcomeEmail(user) {
        const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

        const content = `
            <h1>Welcome Aboard! 🚀</h1>
            <p>Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>Your email has been verified successfully. Your account is now fully activated and ready to use!</p>

            <div class="highlight-box">
                <p style="margin: 0; color: ${this.config.primaryColor}; font-weight: 600;">✓ Your account is secure and ready to go</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </p>

            <h3>Getting Started:</h3>
            <ul style="margin-left: 20px; margin-bottom: 15px; font-size: 13px;">
                <li>Complete your profile for a better experience</li>
                <li>Explore our features and documentation</li>
                <li>Connect with our community</li>
            </ul>

            <p>We're excited to have you as part of the ${this.config.websiteName} community. If you have any questions, we're here to help!</p>

            <hr class="divider">

            <p>Questions? Check out our <a href="${process.env.FRONTEND_URL}/help" style="color: ${this.config.primaryColor}; text-decoration: none;">Help Center</a> or reach out to us at <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">${this.config.supportEmail}</a></p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `Welcome to ${this.config.websiteName}! 🎉`,
            html: this.getEmailTemplate(content, `Welcome to ${this.config.websiteName}`),
        });
    }

    /**
     * Feature: Password Changed Confirmation
     */
    async sendPasswordChangedEmail(user) {
        const content = `
            <h1>Password Changed Successfully ✓</h1>
            <p>Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>This is a confirmation that your password for ${this.config.websiteName} has been changed successfully.</p>

            <div class="highlight-box">
                <p style="margin: 0; color: #666666;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p><strong>What to do next:</strong></p>
            <ul style="margin-left: 20px; margin-bottom: 15px; font-size: 13px;">
                <li>If you made this change, no further action is needed</li>
                <li>If you did NOT change your password, <span class="accent-text">please secure your account immediately</span></li>
            </ul>

            <p class="info-text" style="color: #d9534f;"><strong>⚠️ Suspicious Activity:</strong> If you didn't request this change, click below to secure your account:</p>

            <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/settings" class="button button-secondary">Secure Account</a>
            </p>

            <hr class="divider">

            <p>Your account security is our priority. For any concerns, contact our support team immediately at <a href="mailto:${this.config.supportEmail}" style="color: ${this.config.primaryColor}; text-decoration: none;">${this.config.supportEmail}</a></p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `${this.config.websiteName} - Password changed successfully`,
            html: this.getEmailTemplate(content, `Password changed successfully`),
        });
    }

    /**
     * Feature: Generic Notification Email
     */
    async sendNotificationEmail(user, { title, message, actionUrl, actionText = 'View Details' }) {
        const content = `
            <h1>${title}</h1>
            <p>Hi <strong>${user.name || 'there'}</strong>,</p>
            <p>${message}</p>

            ${actionUrl ? `
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${actionUrl}" class="button">${actionText}</a>
                </p>
            ` : ''}

            <p class="info-text">This notification was sent based on your account settings. You can manage your notification preferences in your account settings.</p>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: `${this.config.websiteName} - ${title}`,
            html: this.getEmailTemplate(content, title),
        });
    }


    /**
     * Send welcome email to newly created facilitator with temporary password
     */
    async sendFacilitatorWelcomeEmail(user, tempPassword, options = {}) {
        const { createdBy, isResend = false } = options;

        const loginUrl = `${process.env.FRONTEND_URL}/facilitator/login`;

        const subject = isResend
            ? 'Your New Temporary Password - ProtectEd Facilitator Portal'
            : 'Welcome to ProtectEd - Your Facilitator Account';

        const html =
            `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                    .credentials-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .password { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #667eea; background: white; padding: 10px; border-radius: 4px; display: inline-block; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                    .steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .step { margin: 15px 0; padding-left: 30px; position: relative; }
                    .step-number { position: absolute; left: 0; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">🎓 ProtectEd Facilitator Portal</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">${isResend ? 'New Account Credentials' : 'Welcome to the Team!'}</p>
                    </div>
                    
                    <div class="content">
                        <p>Hello <strong>${user.name}</strong>,</p>
                        
                        ${isResend
                ? `<p>A new temporary password has been generated for your facilitator account at the request of your administrator.</p>`
                : `<p>Your facilitator account has been created by <strong>${createdBy}</strong>. You now have access to the ProtectEd platform to manage student learning, track progress, and facilitate educational activities.</p>`
            }

                        <div class="credentials-box">
                            <h3 style="margin-top: 0; color: #667eea;">Your Login Credentials</h3>
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Temporary Password:</strong></p>
                            <div class="password">${tempPassword}</div>
                        </div>

                        <div class="warning">
                            <strong>⚠️ Important Security Notice:</strong>
                            <p style="margin: 5px 0 0 0;">This is a temporary password. You will be required to change it immediately after your first login. Please keep this information secure and do not share it with anyone.</p>
                        </div>

                        <div class="steps">
                            <h3 style="margin-top: 0; color: #333;">Getting Started (3 Easy Steps)</h3>
                            
                            <div class="step">
                                <span class="step-number">1</span>
                                <strong>Login to the Facilitator Portal</strong>
                                <p style="margin: 5px 0; color: #666;">Use your email and the temporary password above</p>
                            </div>
                            
                            <div class="step">
                                <span class="step-number">2</span>
                                <strong>Create Your New Password</strong>
                                <p style="margin: 5px 0; color: #666;">Choose a strong, secure password (minimum 8 characters)</p>
                            </div>
                            
                            <div class="step">
                                <span class="step-number">3</span>
                                <strong>Complete Your Profile</strong>
                                <p style="margin: 5px 0; color: #666;">Add your photo and preferences to personalize your experience</p>
                            </div>
                        </div>

                        <center>
                            <a href="${loginUrl}" class="button">Access Facilitator Portal →</a>
                        </center>

                        <h3 style="color: #667eea; margin-top: 30px;">Your Role & Permissions</h3>
                        <p>As a <strong>${user.role === 'educator' ? 'Facilitator/Educator' : 'Moderator'}</strong>, you can:</p>
                        <ul style="color: #666;">
                            <li>Create and manage learning modules</li>
                            <li>Track student progress and performance</li>
                            <li>Generate reports and analytics</li>
                            <li>Communicate with students and parents</li>
                            ${user.role === 'moderator' ? '<li>Moderate content and manage users</li>' : ''}
                        </ul>

                        <h3 style="color: #667eea; margin-top: 30px;">Need Help?</h3>
                        <p>If you have any questions or need assistance:</p>
                        <ul style="color: #666;">
                            <li>📧 Email: <a href="mailto:support@protected.edu">support@protected.edu</a></li>
                            <li>📚 <a href="${process.env.FRONTEND_URL}/facilitator/help">Facilitator Help Center</a></li>
                            <li>💬 Contact your administrator: ${createdBy}</li>
                        </ul>
                    </div>

                    <div class="footer">
                        <p><strong>ProtectEd Platform</strong></p>
                        <p>This email contains sensitive information. Please do not forward it.</p>
                        <p style="color: #999; margin-top: 10px;">
                            If you did not expect this email or believe it was sent in error, please contact your administrator immediately.
                        </p>
                    </div>
                </div>
            </body>
            </html>`
            ;

        const text =
            `Welcome to ProtectEd, ${user.name}!

            ${isResend
                ? 'A new temporary password has been generated for your account.'
                : `Your facilitator account has been created by ${createdBy}.`
            }

            Your Login Credentials:
            Email: ${user.email}
            Temporary Password: ${tempPassword}

            ⚠️ IMPORTANT: This is a temporary password. You will be required to change it after your first login.

            Getting Started:
            1. Login to the Facilitator Portal: ${loginUrl}
            2. Create your new secure password
            3. Complete your profile

            Your Role: ${user.role === 'educator' ? 'Facilitator/Educator' : 'Moderator'}

            Need help? Contact support@protected.edu or visit our Help Center.

            This email contains sensitive information. Please do not forward it.`
            ;

        try {
            await this.sendEmail({
                to: user.email,
                subject,
                html,
                text
            });
            console.log(`Facilitator welcome email sent to ${user.email}`);
        } catch (error) {
            console.error(`Failed to send facilitator welcome email to ${user.email}:`, error);
            throw error;
        }
    };

    /**
     * Send notification when facilitator completes first login and password change
     */
    async sendFacilitatorActivationConfirmation(user) {
        const subject = 'Account Activated - ProtectEd Facilitator Portal';

        const html =
            `<!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                    .success-icon { font-size: 48px; margin: 20px 0; }
                    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="success-icon">✅</div>
                        <h1 style="margin: 0; font-size: 28px;">Account Successfully Activated!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Hello <strong>${user.name}</strong>,</p>
                        
                        <p>Great news! Your facilitator account has been successfully activated. Your password has been securely updated, and you now have full access to the ProtectEd platform.</p>

                        <h3 style="color: #10b981;">What's Next?</h3>
                        <ul style="color: #666;">
                            <li>Explore your facilitator dashboard</li>
                            <li>Set up your first learning module</li>
                            <li>Connect with your students</li>
                            <li>Customize your notification preferences</li>
                        </ul>

                        <p style="margin-top: 20px;">If you have any questions, don't hesitate to reach out to our support team.</p>
                    </div>

                    <div class="footer">
                        <p><strong>ProtectEd Platform</strong></p>
                        <p>Building safer digital learning environments</p>
                    </div>
                </div>
            </body>
            </html>`
            ;

        const text =
            `Account Successfully Activated!

            Hello ${user.name},

            Your facilitator account has been successfully activated. Your password has been securely updated, and you now have full access to the ProtectEd platform.

            What's Next?
            - Explore your facilitator dashboard
            - Set up your first learning module
            - Connect with your students
            - Customize your notification preferences

            If you have any questions, contact our support team.

            ProtectEd Platform`
            ;

        try {
            await this.sendEmail({
                to: user.email,
                subject,
                html,
                text
            });
            console.log(`Activation confirmation sent to ${user.email}`);
        } catch (error) {
            console.error(`Failed to send activation confirmation to ${user.email}:`, error);
        }
    };
}

module.exports = new EmailService();
