const { createClient } = supabase

// Create a single supabase client for interacting with your database
export const db = createClient('https://vrnxohudtrcxmcngvhne.supabase.co', 'sb_publishable_Ogs__3UblsqCPwt8pRDe1A_5rmJvxvp')

export const profileImages = {
    "grey": "assets/default-pfps/grey.svg",
    "blue": "assets/default-pfps/blue.svg",
    "coral": "assets/default-pfps/coral.svg",
    "green": "assets/default-pfps/green.svg",
    "orange": "assets/default-pfps/orange.svg",
    "pink": "assets/default-pfps/pink.svg",
    "purple": "assets/default-pfps/purple.svg",
    "turqoise": "assets/default-pfps/turqoise.svg",
    "yellow": "assets/default-pfps/yellow.svg"
};