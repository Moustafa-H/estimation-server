import { distributeDeck, evaluateField } from './utils'
import { Player } from './player'

type Hands = {
    [key: string]: string[]
}

export class Room {
    private name: string
    private players: Player[]
    private hands: Hands = {}
    private gameStarted = false
    private gameNumber = 0
    private roundNumber = 1
    private turn = -1
    private deckDistributed = false
    private field: string[] = []
    private fieldEvaluated = false
    private points = [0, 0, 0, 0]
    private scores = [0, 0, 0, 0]
    private masterSuit = 4
    private phase = 0
    private dashCall: (boolean | null)[] = [null, null, null, null]
    private skipCall: boolean[] = [false, false, false, false]
    private expectedPoints: number[] = [-1, -1, -1, -1]
    private caller = -1
    private superCall = false
    private withCall = [false, false, false, false]
    private riskPlayer = -1
    private minPoints = 4
    private maxPoints: number | null = 13
    private naPoints = 14
    private doubleGame = false
  
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
    
    getField(): string[] {
        return this.field
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

    getPhase(): number {
        return this.phase
    }

    getDashCall(): (boolean | null)[] {
        return this.dashCall
    }

    getSkipCall(): boolean[] {
        return this.skipCall
    }

    getExpectedPoints(): number[] {
        return this.expectedPoints
    }

    getCaller(): number {
        return this.caller
    }

    getWithCall(): boolean[] {
        return this.withCall
    }

    getSuperCall(): boolean {
        return this.superCall
    }

    getRiskPlayer(): number {
        return this.riskPlayer
    }

    getMinPoints(): number {
        return this.minPoints
    }

    getMaxPoints(): number | null {
        return this.maxPoints
    }

    getNaPoints(): number {
        return this.naPoints
    }

    getDoubleGame(): boolean {
        return this.doubleGame
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
        this.phase = 1
    }

    setPlayerDash(value: boolean, player: Player): boolean {
        this.dashCall[this.players.indexOf(player)] = value
        value?this.expectedPoints[this.players.indexOf(player)]=0:''
        if (!this.dashCall.includes(null)) {
            for (let i = 0; i < 4; i++) {
                if (!this.dashCall[i]) {
                    this.turn = i
                    this.phase = 2
                    return false
                }
            }
            this.restartGame()
            return true
        }
        return false
    }

    private hasNumThreeTimes(): boolean {
        const numCount: {[key: number]: number} = {}
        for (const num of this.expectedPoints) {
            numCount[num] = (numCount[num] || 0) + 1
            if (numCount[num] === 3) {
                return true
            }
        }
        return false
    }

    setPlayerCall(sentSuit: number, sentPoints: number) {
        if (this.phase === 2) {
            // if with call
            if (this.caller!==-1 && this.caller!==this.turn && sentSuit===this.masterSuit && sentPoints===this.expectedPoints[this.caller]) {
                
                this.withCall[this.turn] = true
                // this.expectedPoints[this.turn] = sentPoints
            
            } else {
                
                // new caller
                if (this.caller!==-1 && (sentPoints!==this.expectedPoints[this.caller] || sentSuit!==this.masterSuit)) {
                    for (let i = 0; i < 4; i++) {
                        if (this.withCall[i]) {
                            this.withCall[i] = false
                            this.expectedPoints[i] = -1
                        }
                    }
                    this.expectedPoints[this.caller] = -1
                }
                
                // set the new caller and points
                this.expectedPoints[this.turn] = sentPoints
                for (let i = 0; i < 4; i++){
                    if (this.withCall[i])
                        this.expectedPoints[i] = sentPoints
                }
                this.masterSuit = sentSuit
                this.minPoints = sentPoints
                this.caller = this.turn
                if (sentPoints >= 8)
                    this.superCall = true
            
            }
            const countSkip = this.skipCall.filter(val => val === true).length
            const countDash = this.dashCall.filter(val => val === true).length
            const countWith = this.withCall.filter(val => val === true).length
        
            if (countSkip + countDash + countWith === 3) {
                if (!this.withCall[this.turn]) {
                    this.phase = 3
                    this.minPoints = 0
                    this.maxPoints = this.expectedPoints[this.caller]
                }
                do {
                    this.rotateTurn()
                }
                while (this.dashCall[this.turn] || this.withCall[this.turn])
            } else {
                do {
                    this.rotateTurn()
                } while (this.skipCall[this.turn] || this.dashCall[this.turn] || this.withCall[this.turn])
            }
        } else if (this.phase === 3) {
            if (this.caller!==-1 && this.caller!==this.turn && sentSuit===this.masterSuit && sentPoints===this.expectedPoints[this.caller])
                this.withCall[this.turn] = true
            this.expectedPoints[this.turn] = sentPoints
            if (this.expectedPoints.includes(-1)) {
                do {
                    this.rotateTurn()
                } while (this.dashCall[this.turn])
            }
        }

        const offset = 13 - this.expectedPoints.reduce((acc, current) => acc + current, 0)-1        
        if (this.expectedPoints.filter(val => val === -1).length===1 && offset <= 13) {
            this.naPoints = offset
            if (offset === 0) {
                this.minPoints = 1
            } else if (offset === this.maxPoints) {
                this.maxPoints--
            }
        } else if (!this.expectedPoints.includes(-1)) {
            if (13 - this.expectedPoints.reduce((acc, current) => acc + current, 0) >= 2) {
                this.riskPlayer = this.turn
            }
            this.phase = 4
            this.turn = this.caller
            if (this.hasNumThreeTimes())
                this.doubleGame = true
        }
    }

    setPlayerSkip(player: Player): boolean {
        this.skipCall[this.players.indexOf(player)] = true
        if (this.skipCall.filter(val => val === true).length + this.dashCall.filter(val => val === true).length >= 4) {
            this.restartGame()
            return true
        }

        while (this.skipCall[this.turn] || this.dashCall[this.turn])
            this.rotateTurn()
        return false
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
            // this.field = []
            this.roundNumber++
        } else {
            this.fieldEvaluated = false
        }
    }

    clearField(): void {
        this.field = []
    }

    getRoundResults(): [number, string[], number[]] {
        if (this.roundNumber > 13) {
            this.calculateScores()
        }
        this.field = []
        return [this.turn, this.field, this.points]
    }

    calculateScores() {
        // check for only win and only loss (-1 for no one)
        let onlyWin = -1
        let onlyLoss = -1
        let countWins = 0
        let countLosses = 0

        for (let i = 0; i < 4; i++) {
            if (this.points[i] === this.expectedPoints[i]) {
                countWins++
                if (countWins >= 2) {
                    onlyWin = -1
                } else if (countWins === 1) {
                    onlyWin = i
                }
            } else {
                countLosses++
                if (countLosses >= 2) {
                    onlyLoss = -1
                } else if (countLosses === 1) {
                    onlyLoss = i
                }
            }
        }
        
        // set scores
        if (countWins === 0)
            this.doubleGame = true
        else {
            for (let i = 0; i < 4; i++) {
                let playerScore = 0
                
                if (this.points[i] === this.expectedPoints[i]) {
                    if (this.superCall && i === this.caller) {
                            playerScore += this.points[i] ** 2
                    } else if (this.dashCall[i]) {
                            playerScore += 30
                    } else {
                        playerScore += this.points[i] + 10
                        if (i === this.caller)
                            playerScore += 10
                        if (this.withCall[i])
                            playerScore += 10
                        if (i === this.riskPlayer)
                            playerScore += 10
                        if (i === onlyWin)
                            playerScore += 10
                    }
                } else {
                    if (this.superCall && i === this.caller) {
                    playerScore -= this.expectedPoints[i] ** 2
                    } else if (this.dashCall[i]) {
                    playerScore -= 30
                    } else {
                    playerScore -= Math.abs(this.points[i] - this.expectedPoints[i])
                    if (i === this.caller)
                        playerScore -= 10
                    if (this.withCall[i])
                        playerScore -= 10
                    if (i === this.riskPlayer)
                        playerScore -= 10
                    if (i === onlyLoss)
                        playerScore -= 10
                    }
                }

                if (this.doubleGame)
                    playerScore *= 2
                this.scores[i] += playerScore
            }
            
            this.doubleGame = false
        }

        if (this.gameNumber === 1 || this.gameNumber === 5)
            this.turn = 1
        else if (this.gameNumber === 2 || this.gameNumber === 6)
            this.turn = 2
        else if (this.gameNumber === 3 || this.gameNumber === 7)
            this.turn = 3
        else if (this.gameNumber === 4 || this.gameNumber === 8)
            this.turn = 0
        
        this.deckDistributed = false
        this.roundNumber = 1
        this.phase = 0
        this.points = [0, 0, 0, 0]
        this.expectedPoints = [-1, -1, -1, -1]
        this.dashCall = [null, null, null, null]
        this.caller = -1
        this.superCall = false
        this.withCall = [false, false, false, false]
        this.riskPlayer = -1
        this.minPoints = 4
        this.maxPoints = 13
        this.naPoints = 14
        this.field = []
        this.masterSuit = 4
    }

    restartGame() {
        for (let i = 0; i < this.players.length; i++)
            this.hands[this.players[i].getNickname()] = []
        this.turn = -1
        this.deckDistributed = false
        this.masterSuit = 4
        this.phase = 0
        this.expectedPoints = [-1, -1, -1, -1]
        this.dashCall = [null, null, null, null]
        this.caller = -1
        this.superCall = false
        this.withCall = [false, false, false, false]
        this.riskPlayer = -1
        this.minPoints = 4
        this.maxPoints = 13
        this.naPoints = 14
        this.doubleGame = true
        this.giveOutHands()
    }

    endGame(): void {
        this.hands = {}
        this.gameStarted = false
        this.gameNumber = 0
        this.roundNumber = 1
        this.turn = 0
        this.deckDistributed = false
        this.field = []
        this.fieldEvaluated = false
        this.points = [0, 0, 0, 0]
        this.scores = [0, 0, 0, 0]
        this.masterSuit = 4
        this.phase = 0
        this.expectedPoints = [-1, -1, -1, -1]
        this.dashCall = [null, null, null, null]
        this.caller = -1
        this.superCall = false
        this.withCall = [false, false, false, false]
        this.riskPlayer = -1
        this.minPoints = 4
        this.maxPoints = 13
        this.naPoints = 14
        this.doubleGame = false
    }
}