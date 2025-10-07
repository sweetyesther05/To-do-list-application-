import express from "express"
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express();

app.use(cors ({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser());

// import routes
import { router as userRouter } from "./routes/user.routes.js";
import {homeRouter} from "./routes/home.routes.js"
import { taskRouter } from "./routes/taskRoute.js"

//declare routes
app.use("/api/v1/user", userRouter)
app.use("/api/v2/home", homeRouter)
app.use("/api/v3/task",taskRouter)


export { app }
