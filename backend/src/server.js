import express from "express";import cors from "cors";import helmet from "helmet";import rateLimit from "express-rate-limit";import { initDatabase,seedIfEmpty } from "./db/index.js";import authRoutes from "./routes/auth.js";import assetRoutes from "./routes/assets.js";import hierarchyRoutes from "./routes/hierarchy.js";import importRoutes from "./routes/import.js";import adminRoutes from "./routes/admin.js";import documentRoutes from "./routes/documents.js";import pool from "./db/index.js";import { authRequired } from "./middleware/auth.js";
const app=express();const PORT=parseInt(process.env.PORT||"4000");
app.use(helmet());app.use(cors({origin:process.env.CORS_ORIGIN||"*",credentials:true}));app.use(rateLimit({windowMs:15*60*1000,max:500}));app.use(express.json({limit:"5mb"}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,max:20}),authRoutes);
app.use("/api/assets",assetRoutes);app.use("/api/hierarchy",hierarchyRoutes);app.use("/api/data",importRoutes);app.use("/api/admin",adminRoutes);app.use("/api/documents",documentRoutes);
app.get("/api/settings/public",authRequired,async(_,r)=>{try{const res=await pool.query("SELECT key,value FROM system_settings");const s={};for(const row of res.rows)s[row.key]=row.value;r.json(s);}catch(e){r.json({app_name:"Combat Command"});}});
app.get("/api/modules/enabled",authRequired,async(_,r)=>{try{r.json((await pool.query("SELECT id,name,is_enabled FROM modules")).rows);}catch(e){r.json([]);}});
app.get("/api/custom-fields",authRequired,async(_,r)=>{try{r.json((await pool.query("SELECT * FROM custom_fields WHERE is_active=true ORDER BY display_order")).rows);}catch(e){r.json([]);}});
app.get("/api/health",(_,r)=>r.json({status:"ok"}));
async function start(){console.log("[CBCMD] Starting v5.0...");let retries=15;while(retries>0){try{await initDatabase();await seedIfEmpty();break;}catch(e){retries--;console.log(`[DB] ${e.message} — ${retries} left`);if(!retries)throw e;await new Promise(r=>setTimeout(r,2000));}}app.listen(PORT,"0.0.0.0",()=>console.log(`[CBCMD] API on port ${PORT}`));}
start().catch(e=>{console.error("[FATAL]",e.message);process.exit(1);});
