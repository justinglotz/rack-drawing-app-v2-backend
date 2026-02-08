import "dotenv/config"
import app from "./app.js"
import { prisma } from "./config/prisma.js"

const PORT = process.env.PORT || 8000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
