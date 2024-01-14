import { distributeDeck, evaluateField } from './utils'
import { Player } from './player'

type Hands = {
    [key: string]: string[]
}

type RespectivePlayers = {
    [socketID: string]: string[]
}

export class Room {
    private name: string
    private players: Player[]
    private hands: Hands = {}
    private gameStarted = false
    private gameNumber = 0
    private roundNumber = 1
    private turn = 0
    private deckDistributed = false
    private field: string[] = []
    private fieldEvaluated = false
    private points: number[] = [0, 0, 0, 0]
    private scores: number[] = [0, 0, 0, 0]
    private masterSuit: number = 0
  
    constructor(name: string, players: Player[]) {
      this.name = name
      this.players = players
    }

    getInfo(): string {
        return `Room Name: '${this.name}', Players in room: '${this.players}', Game started?: ${this.gameStarted}`
    }
  
    getName(): string {
      return this.name
    }

    getPlayers(): Player[] {
        return this.players
    }
    
    getHands(): Hands {
        return this.hands
    }
    
    getGameStarted(): boolean {
        return this.gameStarted
    }

    getGameNumber(): number {
        return this.gameNumber
    }

    getRoundNumber(): number {
        return this.roundNumber
    }

    getTurn(): number {
        return this.turn
    }
    
    getDeckDistributed(): boolean {
        return this.deckDistributed
    }

    getFieldLength(): number {
        return this.field.length
    }

    getFieldEvaluated(): boolean {
        return this.fieldEvaluated
    }

    getPoints(): number[] {
        return this.points
    }

    getScores(): number[] {
        return this.scores
    }

    setGameStarted(value: boolean) {
        this.gameStarted = value
    }

    setDeckDistributed(value: boolean) {
        this.deckDistributed = value
    }

    setFieldEvaluated(value: boolean) {
        this.fieldEvaluated = value
    }

    incrementGameNumber() {
        this.gameNumber++
    }

    incrementRoundNumber() {
        this.roundNumber++
    }

    rotateTurn() {
        if (this.turn < 3)
            this.turn++
        else
            this.turn = 0
    }
    
    addPlayer(newPlayer: Player) {
        this.players.push(newPlayer)
    }

    removePlayer(socketID: string) {
        const player = this.players.length!==0?this.players.find((player) => player.getSocketID() === socketID):undefined
        if (player) {
            const index = this.players.indexOf(player)
            this.players.splice(index, 1)
        }
    }

    giveOutHands() {
        const roomPlayers: string[] = []
        for (let i = 0; i < this.players.length; i++) {
            roomPlayers.push(this.players[i].getNickname())
        }
        this.hands = distributeDeck(roomPlayers)
        this.deckDistributed = true
    }

    addCardToField(card: string): void {
        this.field.push(card)
        const playerNicknames: string[] = []
        for (let i = 0; i < this.players.length; i++) {
            playerNicknames.push(this.players[i].getNickname())
        }
        if (this.field.length >= 4) {
            [this.turn, this.hands] = evaluateField(this.field, this.masterSuit, this.hands, playerNicknames)
            this.points[this.turn] += 1
            this.fieldEvaluated = true
            this.field = []
            this.roundNumber++
        }
    }

    clearField(): void {
        this.field = []
    }

    getRoundResults(): [number, string[], number[]] {
        if (this.roundNumber > 13) {
            console.log('hellooo from room.ts')
            this.deckDistributed = false
            this.roundNumber = 1
        }
        return [this.turn, this.field, this.points]
    }
}