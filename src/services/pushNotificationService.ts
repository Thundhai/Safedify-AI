/**
 * PUSH NOTIFICATION SERVICE
 * Handles push notifications for mobile PWA experience
 * Features real-time safety alerts and incident notifications
 */

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NqIcGB7b6bNTrEVcOepJRbOiYzp1YG4ggaO3z4XDJ5V9qgfhofNOQU'; // Replace with your VAPID key
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready for push notifications');
      
      await this.checkExistingSubscription();
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  private async checkExistingSubscription(): Promise<void> {
    if (!this.registration) return;

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        await this.sendSubscriptionToServer(this.subscription);
      }
    } catch (error) {
      console.error('Failed to check existing subscription:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(): Promise<boolean> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return false;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      console.log('✅ Push notification subscription created');
      
      await this.sendSubscriptionToServer(subscription);
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      console.log('✅ Unsubscribed from push notifications');
      
      // Notify server to remove subscription
      await this.removeSubscriptionFromServer();
      return true;
    } catch (error) {
      console.error('❌ Failed to unsubscribe:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      // In a real app, send to your backend API
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      console.log('📡 Subscription sent to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      // Store locally for retry
      localStorage.setItem('pendingPushSubscription', JSON.stringify(subscription));
    }
  }

  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: Date.now() })
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };

    try {
      await this.registration.showNotification(payload.title, options);
      console.log('📢 Notification shown:', payload.title);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Predefined notification types for common safety scenarios
  async showIncidentAlert(incident: {
    id: string;
    title: string;
    severity: string;
    location: string;
  }): Promise<void> {
    const severityEmojis = {
      low: '🟨',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    await this.showNotification({
      title: `${severityEmojis[incident.severity as keyof typeof severityEmojis]} Safety Alert`,
      body: `${incident.title} at ${incident.location}`,
      tag: `incident-${incident.id}`,
      requireInteraction: incident.severity === 'critical',
      data: { 
        type: 'incident',
        incidentId: incident.id,
        url: `/incidents/${incident.id}`
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'acknowledge', title: 'Acknowledge' }
      ]
    });
  }

  async showEmergencyAlert(emergency: {
    title: string;
    location: string;
    instructions: string;
  }): Promise<void> {
    await this.showNotification({
      title: '🚨 EMERGENCY ALERT',
      body: `${emergency.title} - ${emergency.location}`,
      tag: 'emergency',
      requireInteraction: true,
      data: { 
        type: 'emergency',
        instructions: emergency.instructions,
        url: '/emergency'
      },
      actions: [
        { action: 'emergency', title: 'View Emergency Info' },
        { action: 'safe', title: 'Mark Safe' }
      ]
    });
  }

  async showReminderNotification(reminder: {
    title: string;
    description: string;
    type: 'inspection' | 'training' | 'permit';
  }): Promise<void> {
    const typeEmojis = {
      inspection: '🔍',
      training: '📚',
      permit: '📋'
    };

    await this.showNotification({
      title: `${typeEmojis[reminder.type]} Reminder`,
      body: `${reminder.title}: ${reminder.description}`,
      tag: `reminder-${reminder.type}`,
      data: { 
        type: 'reminder',
        reminderType: reminder.type,
        url: `/${reminder.type}s`
      },
      actions: [
        { action: 'complete', title: 'Complete Now' },
        { action: 'snooze', title: 'Remind Later' }
      ]
    });
  }

  async showSafetyTip(): Promise<void> {
    const tips = [
      'Remember to wear your safety helmet in construction zones',
      'Check your PPE before starting work',
      'Report near misses to help prevent future incidents',
      'Take breaks to prevent fatigue-related accidents',
      'Keep emergency contact numbers updated',
      'Complete your safety training modules',
      'Inspect your tools before use',
      'Follow lockout/tagout procedures'
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    await this.showNotification({
      title: '💡 Safety Tip',
      body: randomTip,
      tag: 'safety-tip',
      data: { type: 'tip', url: '/training' }
    });
  }

  // Test notification
  async sendTestNotification(): Promise<void> {
    await this.showNotification({
      title: '🧪 Test Notification',
      body: 'Safedify AI push notifications are working!',
      tag: 'test',
      data: { type: 'test' }
    });
  }

  // Utility method to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check notification support
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<{
    supported: boolean;
    permission: string;
    subscribed: boolean;
  }> {
    return {
      supported: this.isSupported(),
      permission: Notification.permission,
      subscribed: !!this.subscription
    };
  }

  // Schedule daily safety tips
  async scheduleDailySafetyTips(): Promise<void> {
    // In a real app, this would be handled by the backend
    // For demo purposes, we'll show it once
    setTimeout(() => {
      this.showSafetyTip();
    }, 60000); // Show after 1 minute
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

// Auto-initialize when online
if (navigator.onLine) {
  pushNotificationService.init();
}

// Listen for service worker ready event
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      pushNotificationService.init();
    });
  }
});

export default pushNotificationService;