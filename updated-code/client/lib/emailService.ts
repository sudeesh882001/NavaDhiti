import emailjs from '@emailjs/browser';

// EmailJS configuration - replace with your actual values
const EMAILJS_SERVICE_ID = 'service_gqmehuj';
const EMAILJS_TEMPLATE_ID_ADMIN = 'template_59dimuo';
const EMAILJS_TEMPLATE_ID_USER = 'template_epmw5n9';
const EMAILJS_PUBLIC_KEY = 'FZQfapcBsZj50tYjj';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface AdminNotificationData {
  questionTitle: string;
  questionBody: string;
  authorName: string;
  authorEmail: string;
  tags: string[];
  questionId: string;
}

export interface UserNotificationData {
  questionTitle: string;
  questionBody: string;
  tags: string[];
  questionId: string;
  userName: string;
  userEmail: string;
}

// Send notification to admin when a new question is posted
export const sendAdminNotification = async (data: AdminNotificationData): Promise<boolean> => {
  try {
    const templateParams = {
      to_email: 'sudeeshsri882001@gmail.com', // Admin email
      question_title: data.questionTitle,
      question_body: data.questionBody.substring(0, 200) + '...', // Truncate for email
      author_name: data.authorName,
      author_email: data.authorEmail,
      tags: data.tags.join(', '),
      question_url: `${window.location.origin}/question/${data.questionId}`,
      admin_url: `${window.location.origin}/admin`
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_ADMIN,
      templateParams
    );

    console.log('Admin notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
};

// Send notification to users with matching skills when a question is approved
// From emailService.ts
export const sendUserNotification = async (data: UserNotificationData): Promise<boolean> => {
    try {
        console.log('[USER_NOTIF] Attempting to send user notification...');
        console.log('[USER_NOTIF] User notification data:', data); // CRUCIAL: Check 'userEmail' here
        
        const templateParams = {
            to_email: data.userEmail,
            user_name: data.userName,
            question_title: data.questionTitle,
            question_body: data.questionBody.substring(0, 200) + '...',
            tags: data.tags.join(', '), // Ensure this matches your EmailJS template variable
            question_url: `${window.location.origin}/question/${data.questionId}`
        };

        console.log('[USER_NOTIF] User notification templateParams:', templateParams); // Check final params

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_USER,
            templateParams
        );

        console.log('[USER_NOTIF] User notification sent successfully:', response);
        return true;
    } catch (error) {
        console.error('[USER_NOTIF] Failed to send user notification:', error);
        // This 'error' object from EmailJS can be very informative!
        return false;
    }
};
// Send notifications to multiple users
export const sendBulkUserNotifications = async (
  questionData: Omit<UserNotificationData, 'userName' | 'userEmail'>,
  users: Array<{ name: string; email: string }>
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  // Send notifications with a small delay to avoid rate limiting
  for (const user of users) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      const result = await sendUserNotification({
        ...questionData,
        userName: user.name,
        userEmail: user.email
      });
      
      if (result) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send notification to ${user.email}:`, error);
      failed++;
    }
  }

  return { success, failed };
};

// Configuration helper for setup
export const configureEmailJS = (
  serviceId: string,
  adminTemplateId: string,
  userTemplateId: string,
  publicKey: string
) => {
  // This would typically be set via environment variables
  console.log('EmailJS Configuration:');
  console.log('Service ID:', serviceId);
  console.log('Admin Template ID:', adminTemplateId);
  console.log('User Template ID:', userTemplateId);
  console.log('Public Key:', publicKey);
  console.log('\nPlease update the emailService.ts file with your actual EmailJS credentials.');
};
  