// Lovable integration removed. The project now uses Supabase native OAuth.
// This placeholder preserves the public `lovable` API shape so any lingering
// imports do not break immediately. If this module is accidentally used,
// it throws an explicit error to help identify remaining callers.

export const lovable = {
  auth: {
    signInWithOAuth: async () => {
      throw new Error(
        "Lovable integration removed: use Supabase native OAuth. This placeholder exists to avoid runtime import errors."
      );
    },
  },
};
