import {MobileLoginStatus} from "../MobileLoginStatus.ts";

export interface SocketIoMobileLoginStatusInput {
    status: MobileLoginStatus;
    errMessage?: string;
}
