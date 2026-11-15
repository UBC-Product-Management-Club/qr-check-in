/** Only accounts on this Google Workspace domain can use the app. */
export const PMC_EMAIL_DOMAIN = 'ubcpmc.com';

export const isPmcEmail = (email: string) =>
    email.trim().toLowerCase().endsWith(`@${PMC_EMAIL_DOMAIN}`);
