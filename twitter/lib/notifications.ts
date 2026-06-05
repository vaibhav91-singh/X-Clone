/**
 * Browser Notification Utility
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  console.log("NOTIFY ATTEMPT:", title, options);
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.log("NOTIFICATION SKIPPED: Permission not granted or unsupported");
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico", // Default icon
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error("Error showing notification:", error);
  }
};

export const containsKeywords = (content: string): boolean => {
  const keywords = ["cricket", "science"];
  const lowerContent = content.toLowerCase();
  return keywords.some((keyword) => lowerContent.includes(keyword));
};
