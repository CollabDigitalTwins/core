// Ambient module augmentations (next-auth User/Session/JWT). Imported for
// side effects so tsup's isolated DTS pass loads the augmentation — without
// this, `user.organizationId` etc. fail to type-check in the published .d.ts.
import './core/types/next-auth';

// Components
export * from './core';
