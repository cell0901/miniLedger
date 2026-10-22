import express from "express"
import cors from "cors"
import { mainRouter } from "./routes/main"

const app = express();
app.use(cors())
app.use(express.json())

app.use('/api', mainRouter);

app.listen(3000)
