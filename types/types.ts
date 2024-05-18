export type Room = {
	name: string,
	ready: boolean
}

export type Rooms = {
    [roomName: string]: Room[];
}

export type User = {
	name: string,
	ready: boolean
}

