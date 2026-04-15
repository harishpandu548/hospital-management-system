import Redis from "ioredis"

if(!process.env.REDIS_URL){
    throw new Error("REDIS_URL is not found or defined")
}

//creation of Redis client
export const redis=new Redis(process.env.REDIS_URL,{
    maxRetriesPerRequest:3,
    enableReadyCheck:true,
    lazyConnect:true,

    retryStrategy(times){
        const delay=Math.min(times*50,2000)
        return delay
    }
})

redis.on("connect",()=>{
    console.log("Redis connected")
})
redis.on("ready",()=>{
    console.log("Redis is ready")
})
redis.on("error",(err)=>{
    console.error("Redis error",err)
})
redis.on("close",()=>{
    console.warn("Redis connection closed")
})

process.on("SIGINT",async()=>{
    console.log("Shutting down redis")
    await redis.quit()
    process.exit(0)
})

process.on("SIGTERM",async()=>{
    console.log("Terminating redis")
    await redis.quit()
    process.exit(0)
})