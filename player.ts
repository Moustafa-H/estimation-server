export class Player {
    private socketID: string
    private nickname: string
  
    constructor(socketID: string, nickname: string) {
      this.socketID = socketID
      this.nickname = nickname
    }
  
    getSocketID(): string {
      return this.socketID
    }

    getNickname(): string {
        return this.nickname
    }
  
    getInfo(): string {
      return `Player Nickname: '${this.nickname}', SocketID: '${this.socketID}'`
    }
}