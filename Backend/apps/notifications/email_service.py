"""
Gmail SMTP Email Service for Pro Totaal Service.

Sends notification emails using Gmail SMTP with App Password.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging

from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """Gmail SMTP email service."""
    
    SMTP_SERVER = 'smtp.gmail.com'
    SMTP_PORT = 587
    
    def __init__(self, sender_email: str = '', app_password: str = ''):
        self.sender_email = sender_email
        self.app_password = app_password
    
    @classmethod
    def from_config(cls):
        """Create EmailService from SystemConfig."""
        from apps.core.models import SystemConfig
        config = SystemConfig.objects.get_config()
        return cls(
            sender_email=config.smtp_email,
            app_password=config.smtp_password
        )
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return bool(self.sender_email and self.app_password)
    
    def send_email(
        self,
        recipients: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send email to recipients.
        
        Args:
            recipients: List of email addresses
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text fallback (auto-generated if not provided)
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Email service not configured")
            return False
        
        if not recipients:
            logger.warning("No recipients provided")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"CKM Services <{self.sender_email}>"
            msg['To'] = ', '.join(recipients)
            
            # Plain text version
            if not text_content:
                text_content = strip_tags(html_content)
            
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Send via Gmail SMTP
            with smtplib.SMTP(self.SMTP_SERVER, self.SMTP_PORT) as server:
                server.starttls()
                server.login(self.sender_email, self.app_password)
                server.sendmail(self.sender_email, recipients, msg.as_string())
            
            logger.info(f"Email sent successfully to {recipients}")
            return True
            
        except smtplib.SMTPAuthenticationError:
            logger.error("Gmail authentication failed. Check App Password.")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_notification_email(
        self,
        recipients: List[str],
        notification_title: str,
        notification_message: str,
        notification_category: str,
        notification_priority: str,
        action_url: Optional[str] = None
    ) -> bool:
        """
        Send a notification email with standard template.
        """
        # Priority badge color
        priority_colors = {
            'urgent': '#DC2626',
            'high': '#F59E0B',
            'normal': '#3B82F6',
            'low': '#6B7280',
        }
        priority_color = priority_colors.get(notification_priority, '#3B82F6')
        
        # Category icons (emoji for email compatibility)
        category_icons = {
            'employees': '👤',
            'worklogs': '📝',
            'certificates': '🏥',
            'invoices': '📄',
            'projects': '📁',
            'wallet': '💰',
            'system': '⚙️',
        }
        category_icon = category_icons.get(notification_category, '📢')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 24px; color: white; }}
                .header h1 {{ margin: 0; font-size: 20px; }}
                .content {{ padding: 24px; }}
                .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; background-color: {priority_color}; }}
                .category {{ color: #6B7280; font-size: 14px; margin-bottom: 12px; }}
                .title {{ font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px; }}
                .message {{ color: #4B5563; line-height: 1.6; }}
                .button {{ display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }}
                .footer {{ padding: 16px 24px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 CKM Services</h1>
                </div>
                <div class="content">
                    <span class="badge">{notification_priority.upper()}</span>
                    <p class="category">{category_icon} {notification_category.title()}</p>
                    <h2 class="title">{notification_title}</h2>
                    <p class="message">{notification_message}</p>
                    {f'<a href="{action_url}" class="button">View Details →</a>' if action_url else ''}
                </div>
                <div class="footer">
                    This is an automated notification from CKM Services.
                </div>
            </div>
        </body>
        </html>
        """
        
        subject = f"[{notification_priority.upper()}] {notification_title}"
        return self.send_email(recipients, subject, html_content)


def send_notification_email_if_enabled(notification) -> bool:
    """
    Check email rules and send email if enabled for this notification.
    Uses category_recipients for targeted routing, falls back to notification_recipients.
    
    Args:
        notification: Notification model instance
        
    Returns:
        True if email was sent, False otherwise
    """
    from apps.core.models import SystemConfig
    
    config = SystemConfig.objects.get_config()
    
    # Check if SMTP is enabled
    if not config.smtp_enabled:
        return False
    
    category = notification.category
    priority = notification.priority
    
    # Check email rules based on category
    should_send = False
    
    # High priority always sends if enabled
    if priority in ['high', 'urgent'] and config.email_on_high_priority:
        should_send = True
    # Check category-specific rules
    elif category == 'employees' and config.email_on_employees:
        should_send = True
    elif category == 'worklogs' and config.email_on_worklogs:
        should_send = True
    elif category == 'certificates' and config.email_on_certificates:
        should_send = True
    elif category == 'invoices' and config.email_on_invoices:
        should_send = True
    
    if not should_send:
        return False
    
    # Get recipients: first try category-specific, then fall back to general
    category_recipients = config.category_recipients or {}
    recipients = category_recipients.get(category, [])
    
    # If no category-specific recipients, use general notification_recipients
    if not recipients:
        recipients = config.notification_recipients or []
    
    if not recipients:
        return False
    
    # Build full action URL
    action_url = notification.action_url
    if action_url and not action_url.startswith('http'):
        frontend_url = getattr(config, 'frontend_url', 'http://localhost:3000')
        action_url = f"{frontend_url.rstrip('/')}{action_url}"
    
    # Send email
    email_service = EmailService.from_config()
    success = email_service.send_notification_email(
        recipients=recipients,
        notification_title=notification.title,
        notification_message=notification.message,
        notification_category=notification.category,
        notification_priority=notification.priority,
        action_url=action_url or None
    )
    
    if success:
        from django.utils import timezone
        notification.email_sent = True
        notification.save(update_fields=['email_sent', 'updated_at'])
    
    return success
