import { UserData } from './ApiTypes';
declare global {
    namespace Express {
        interface Request {
            user?: UserData;
        }
    }
}
export {};
//# sourceMappingURL=ExpressTypes.d.ts.map