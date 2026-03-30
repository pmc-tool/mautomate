export type PlatformKey = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'youtube' | 'youtube_shorts';

export interface PlatformConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scopes: string[];
  pkce: boolean;
  color: string;
  instructions: string;
}

export const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
  facebook: {
    name: 'Facebook',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me?fields=id,name,picture',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    pkce: false,
    color: '#1877F2',
    instructions: 'Create an app at developers.facebook.com',
  },
  instagram: {
    name: 'Instagram',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me?fields=id,username,name',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    pkce: false,
    color: '#E4405F',
    instructions: 'Create an app at developers.facebook.com with Instagram permissions',
  },
  linkedin: {
    name: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    profileUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'w_member_social'],
    pkce: false,
    color: '#0A66C2',
    instructions: 'Create an app at linkedin.com/developers',
  },
  x: {
    name: 'X (Twitter)',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    profileUrl: 'https://api.x.com/2/users/me',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    pkce: true,
    color: '#000000',
    instructions: 'Create a project at developer.x.com',
  },
  tiktok: {
    name: 'TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    profileUrl: 'https://open.tiktokapis.com/v2/user/info/',
    scopes: ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'],
    pkce: true,
    color: '#000000',
    instructions: 'Create an app at developers.tiktok.com',
  },
  youtube: {
    name: 'YouTube',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    pkce: false,
    color: '#FF0000',
    instructions: 'Create OAuth credentials at console.cloud.google.com',
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    pkce: false,
    color: '#FF0000',
    instructions: 'Create OAuth credentials at console.cloud.google.com',
  },
};

export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];

/**
 * Type-guard that checks whether a string is a valid {@link PlatformKey}.
 */
export function isPlatformKey(value: string): value is PlatformKey {
  return PLATFORM_KEYS.includes(value as PlatformKey);
}
