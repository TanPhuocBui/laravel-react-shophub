import { createContext } from 'react';

// Public layout coordinates GET loading/errors; mutations never register here.
export const CatalogLoadContext = createContext(null);
