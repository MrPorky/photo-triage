import { Preferences } from '@capacitor/preferences';
import { createCollection } from '@tanstack/react-db';
import { photoSchema } from '../zod/photo';
import { localStorageCollectionOptions } from './storage';

export const photoCollection = createCollection(
  localStorageCollectionOptions({
    id: 'photos',
    storageKey: 'photos',
    schema: photoSchema,
    getKey: (photo) => photo.id,
    storage: {
      getItem(key) {
        return Preferences.get({ key }).then((result) => result.value);
      },
      removeItem(key) {
        return Preferences.remove({ key });
      },
      async setItem(key, value) {
        await Preferences.set({ key, value });
      },
    },
  }),
);
