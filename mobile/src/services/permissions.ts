/**
 * Permissions Service
 * Handles requesting and checking permissions at app launch
 */

import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMS_REQUESTED_KEY = '@permissions_requested';

export interface PermissionStatus {
  storage: boolean;
  notifications: boolean;
}

/**
 * Check current permission statuses
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  const [mediaResult, notifResult] = await Promise.all([
    MediaLibrary.getPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);

  return {
    storage: mediaResult.granted,
    notifications: notifResult.granted,
  };
}

/**
 * Request all permissions (called on first launch)
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
  const [mediaResult, notifResult] = await Promise.all([
    MediaLibrary.requestPermissionsAsync(),
    Notifications.requestPermissionsAsync(),
  ]);

  await AsyncStorage.setItem(PERMS_REQUESTED_KEY, 'true');

  return {
    storage: mediaResult.granted,
    notifications: notifResult.granted,
  };
}

/**
 * Check if permissions have been requested before
 */
export async function hasRequestedPermissions(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PERMS_REQUESTED_KEY);
  return val === 'true';
}

/**
 * Open system settings for the app
 */
export function openAppSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}
