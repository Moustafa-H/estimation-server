import { Player } from './player'
import { Room } from './room'

const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)

import { Server, Socket } from 'socket.io'
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

let connectedClients: string[] = []
let players: Player[] = []
let rooms: Room[] = []

io.on('connection', (socket) => {
  console.log('connection by', socket.id)
  connectedClients.push(socket.id)
  console.log('connectedClients:', connectedClients)

  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected')
    const newConnectedClients = connectedClients.filter(prevClients => prevClients !== socket.id)
    connectedClients = newConnectedClients
    console.log('connectedClients after disconnect:', connectedClients)
    
    removePlayerFromRoom(socket)

    for (let i = 0; i < players.length; i++) {
      if (players[i].getSocketID() === socket.id) {
        players.splice(i, 1)
      }
    }
  })

  socket.on('init-player', (nickname: string) => {
    let player = players.length!==0?players.find((player) => player.getNickname() === nickname):undefined
    if (player === undefined) {
      player = new Player(socket.id, nickname)
      players.push(player)
      console.log(player.getInfo())
      socket.emit('init-player', (nickname))
    } else {
      socket.emit('already-exists')
    }
  })

  // room effects
  socket.on('get-rooms', () => {
    const newRooms = generateRoomsDictionary()
    socket.emit('get-rooms', (newRooms))
  })

  socket.on('create-room', (roomName: string) => {
    let player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    if (player) {
      let room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
      if (room === undefined) {
        room = new Room(roomName, [player])
        rooms.push(room)
        console.log('new room:', roomName, ', created by:', socket.id, ', current room players:', room.getPlayers())
        const newRooms = generateRoomsDictionary()
        socket.emit('create-room', ({newRooms, roomName}))
        socket.broadcast.emit('get-rooms', (newRooms))
      } else {
        socket.emit('already-exists')
      }
    }
  })

  socket.on('join-room', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && !room.getPlayers().includes(player)) {
      room.addPlayer(player)
      console.log('player', socket.id, ', joined room', roomName, ', current room players:', room.getPlayers())
      const newRooms = generateRoomsDictionary()
      socket.emit('join-room', ({newRooms, roomName}))
      socket.broadcast.emit('get-rooms', (newRooms))
    }
  })

  socket.on('start-game', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      const newPlayers: string[] = []
      const players = room.getPlayers()
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        newPlayers.push(players[i].getNickname())
      }
      
      const newTurn = 0
      room.setGameStarted(true)
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('start-game', ({newTurn, newPlayers}))
      }
      socket.emit('start-game', ({newTurn, newPlayers}))
    }
  })

  socket.on('leave-room', () => {
    removePlayerFromRoom(socket)
  })

  // game effects
  socket.on('update-hands', (roomName: string) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      if (room.getGameStarted() && !room.getDeckDistributed()) {
        console.log('helloooo from update-hands')
        room.giveOutHands()
        room.incrementGameNumber()
      }
      const newHands = modifyHands(player, room)
      const newScores = room.getScores()
      const newGameNum = room.getGameNumber()
      socket.emit('update-hands', ({newHands, newScores, newGameNum}))
    }
  })

  socket.on('play-card', ({roomName, card}) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      room.rotateTurn()
      room.addCardToField(card)
      const newTurn = room.getTurn()
      const len = room.getPlayers().length
      for (let i = 0; i < len; i++) {
        socket.to(room.getPlayers()[i].getSocketID()).emit('play-card', ({card, newTurn}))
      }
      socket.emit('play-card', ({card, newTurn}))
    }
  })

  socket.on('yes-dash', (roomName: string) => {
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (room !== undefined)
      socket.broadcast.emit('yes-dash')
  })
  
  socket.on('no-dash', (roomName: string) => {
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (room !== undefined)
      socket.broadcast.emit('no-dash')
  })

  socket.on('yes-call', ({roomName, sentSuit, sentPoints}) => {
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (room !== undefined)
      socket.broadcast.emit('yes-call', {sentSuit, sentPoints})
  })

  socket.on('skip-call', (roomName: string) => {
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (room !== undefined)
      socket.broadcast.emit('skip-call')
  })

  socket.on('evaluate-field', (roomName) => {
    const player = players.length!==0?players.find((player) => player.getSocketID() === socket.id):undefined
    const room = rooms.length!==0?rooms.find((room) => room.getName() === roomName):undefined
    if (player !== undefined && room !== undefined && room.getPlayers().includes(player)) {
      let newTurn = 0,
          newField: string[] = [],
          newPoints: number[] = []
      if (room.getFieldEvaluated()) {
        [newTurn, newField, newPoints] = room.getRoundResults()
        const newHands = modifyHands(player, room)
        socket.emit('evaluate-field', ({newTurn, newHands, newField, newPoints}))
      }
    }
  })
})

server.listen(3001, () => {
  console.log('Server listening on port 3001')
})

const removePlayerFromRoom = (socket: Socket) => {
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] !== undefined) {
      for (let j = 0; j < rooms[i].getPlayers().length; j++) {
        if (rooms[i].getPlayers()[j].getSocketID() === socket.id) {
          rooms[i].removePlayer(socket.id)
          console.log('player', socket.id, 'left room', rooms[i].getName(), ', updated rooms:', rooms)
        }
      }
    
      if (rooms[i].getPlayers().length === 0) {
        console.log('room', rooms[i].getName(), 'is now empty, deleting...')
        rooms.splice(i, 1)
        console.log('updated rooms:', rooms)
      }
    }
  }

  socket.emit('leave-room')
  const newRooms = generateRoomsDictionary()
  socket.emit('get-rooms', (newRooms))
  socket.broadcast.emit('get-rooms', (newRooms))
}

const generateRoomsDictionary = () => {
  const newRooms: {[name: string]: string[]} = {}
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i] !== undefined) {
      const len = rooms[i].getPlayers().length
      for (let j = 0; j < len; j++) {
        if (newRooms[rooms[i].getName()] !== undefined)
          newRooms[rooms[i].getName()].push(rooms[i].getPlayers()[j].getNickname())
        else
          newRooms[rooms[i].getName()] = [rooms[i].getPlayers()[j].getNickname()]
      }
    }
  }
  return newRooms
}

const modifyHands = (player: Player, room: Room): {[key: string]: string[]} => {
  const newHands: {[key: string]: string[]} = {}
  const len = room.getPlayers().length
  for (let i = 0; i < len; i++) {
    if (i !== room.getPlayers().indexOf(player))
      newHands[room.getPlayers()[i].getNickname()] = Array(14 - room.getRoundNumber()).fill('facedown')
    else
      newHands[room.getPlayers()[i].getNickname()] = room.getHands()[room.getPlayers()[i].getNickname()]
  }
  return newHands
}