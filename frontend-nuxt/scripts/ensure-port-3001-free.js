import net from 'node:net'

const port = 3001
const host = '0.0.0.0'

const server = net.createServer()

server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is busy. Stop the process using it before starting Nuxt.`)
    console.error(`Try: lsof -i :${port}`)
    console.error('Then: kill -9 <PID>')
    process.exit(1)
  }

  console.error(error.message)
  process.exit(1)
})

server.once('listening', () => {
  server.close(() => process.exit(0))
})

server.listen(port, host)
