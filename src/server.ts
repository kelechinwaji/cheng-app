import express, { Request, Response, NextFunction } from "express";
import config from 'config'
import bodyParser, { json } from "body-parser";
import cors from 'cors';

const port = config.get<number>('port')
const app = express();
app.use(bodyParser.json());
app.use(cors())



app.get("/api/v1/info", (req:Request , res:Response)=>{
 try {
    res.status(200).send({
        "slackUsername":"Kelechi Nwaji",
        "backend":true,
        "age":911,
        "bio":"cycle.code.chaw"})
 } catch (error) {
    res.status(405).send({
        err: "Something went wrong"
    })
 }
})

app.all('*', (req: Request, res: Response, next: NextFunction)=>{
    res.status(404).json({
        success: false,
        message: "path not found"
     })
})

app.listen(port, ()=>{
    console.log(`App is running on ${port}`);
})



