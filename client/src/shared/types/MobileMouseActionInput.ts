export interface MobileMouseActionInput {
    type: MobileMouseEvent;
    x: number;
    y: number;
}

export enum MobileMouseEvent {
    CLICK = 'click',
}
