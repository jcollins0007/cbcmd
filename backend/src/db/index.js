import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ host:process.env.DB_HOST||"db", port:parseInt(process.env.DB_PORT||"5432"), database:process.env.DB_NAME||"combatcommand", user:process.env.DB_USER||"cbcmd_admin", password:process.env.DB_PASSWORD||"changeme", max:20 });

export async function initDatabase() {
  const c = await pool.connect();
  try { await c.query(`
    CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE NOT NULL, display_name VARCHAR(200) NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'user', created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS utcs (id VARCHAR(50) PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS warehouse_locations (id VARCHAR(20) PRIMARY KEY, row_label CHAR(1) NOT NULL, col_number INT NOT NULL, label VARCHAR(50) NOT NULL, UNIQUE(row_label, col_number));
    CREATE TABLE IF NOT EXISTS fcps (id VARCHAR(50) PRIMARY KEY, name VARCHAR(200) NOT NULL, utc_id VARCHAR(50) REFERENCES utcs(id) ON DELETE CASCADE, status VARCHAR(50) DEFAULT 'Ready to Deploy', warehouse_location_id VARCHAR(20) REFERENCES warehouse_locations(id) ON DELETE SET NULL);
    CREATE TABLE IF NOT EXISTS packages (id VARCHAR(50) PRIMARY KEY, name VARCHAR(200) NOT NULL, fcp_id VARCHAR(50) REFERENCES fcps(id) ON DELETE CASCADE, type VARCHAR(50) DEFAULT '');
    CREATE TABLE IF NOT EXISTS increments (id VARCHAR(50) PRIMARY KEY, name VARCHAR(200) NOT NULL, inc_number INT NOT NULL, fcp_id VARCHAR(50) REFERENCES fcps(id) ON DELETE CASCADE, notes TEXT DEFAULT '', UNIQUE(fcp_id, inc_number));
    CREATE TABLE IF NOT EXISTS increment_requirements (id SERIAL PRIMARY KEY, increment_id VARCHAR(50) REFERENCES increments(id) ON DELETE CASCADE, item_name VARCHAR(200) NOT NULL, category VARCHAR(100) DEFAULT '', required_qty INT DEFAULT 1, unit_cost DECIMAL(10,2) DEFAULT 0, notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS assets (id VARCHAR(100) PRIMARY KEY, asset_tag VARCHAR(100) UNIQUE NOT NULL, serial VARCHAR(200) UNIQUE NOT NULL, name VARCHAR(200) NOT NULL, model VARCHAR(200) DEFAULT '', category VARCHAR(100) DEFAULT 'Uncategorized', status VARCHAR(50) DEFAULT 'Ready to Deploy', package_id VARCHAR(50) REFERENCES packages(id) ON DELETE SET NULL, fcp_id VARCHAR(50) REFERENCES fcps(id) ON DELETE SET NULL, utc_id VARCHAR(50) REFERENCES utcs(id) ON DELETE SET NULL, increment_id VARCHAR(50) REFERENCES increments(id) ON DELETE SET NULL, warehouse_location_id VARCHAR(20) REFERENCES warehouse_locations(id) ON DELETE SET NULL, notes TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS asset_history (id SERIAL PRIMARY KEY, asset_id VARCHAR(100) REFERENCES assets(id) ON DELETE CASCADE, action VARCHAR(100) NOT NULL, user_name VARCHAR(200) NOT NULL, details TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS asset_components (id SERIAL PRIMARY KEY, asset_id VARCHAR(100) REFERENCES assets(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, quantity INT DEFAULT 1, category VARCHAR(100) DEFAULT '', serial VARCHAR(200) DEFAULT '', status VARCHAR(50) DEFAULT 'Good', notes TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS custom_fields (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, field_key VARCHAR(100) UNIQUE NOT NULL, field_type VARCHAR(20) DEFAULT 'text', options TEXT DEFAULT '', is_required BOOLEAN DEFAULT false, display_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS custom_field_values (id SERIAL PRIMARY KEY, asset_id VARCHAR(100) REFERENCES assets(id) ON DELETE CASCADE, field_id INT REFERENCES custom_fields(id) ON DELETE CASCADE, value TEXT DEFAULT '', UNIQUE(asset_id, field_id));
    CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, label VARCHAR(200) DEFAULT '', description TEXT DEFAULT '', setting_type VARCHAR(20) DEFAULT 'text', updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS dropdown_options (id SERIAL PRIMARY KEY, dropdown_name VARCHAR(100) NOT NULL, value VARCHAR(200) NOT NULL, display_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, UNIQUE(dropdown_name, value));
    CREATE TABLE IF NOT EXISTS modules (id VARCHAR(50) PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT DEFAULT '', category VARCHAR(50) DEFAULT 'general', is_enabled BOOLEAN DEFAULT false, config JSONB DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS snapshots (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, description TEXT DEFAULT '', created_by VARCHAR(200) NOT NULL, size_bytes BIGINT DEFAULT 0, filename VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, filename VARCHAR(500) NOT NULL, original_name VARCHAR(500) NOT NULL, file_size BIGINT DEFAULT 0, mime_type VARCHAR(200) DEFAULT '', asset_id VARCHAR(100) REFERENCES assets(id) ON DELETE CASCADE, increment_id VARCHAR(50) REFERENCES increments(id) ON DELETE CASCADE, uploaded_by VARCHAR(200) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
    CREATE INDEX IF NOT EXISTS idx_assets_inc ON assets(increment_id);
    CREATE INDEX IF NOT EXISTS idx_assets_fcp ON assets(fcp_id);
    CREATE INDEX IF NOT EXISTS idx_increments_fcp ON increments(fcp_id);
    CREATE INDEX IF NOT EXISTS idx_inc_req ON increment_requirements(increment_id);
    CREATE INDEX IF NOT EXISTS idx_docs_asset ON documents(asset_id);
    CREATE INDEX IF NOT EXISTS idx_docs_inc ON documents(increment_id);
    CREATE INDEX IF NOT EXISTS idx_history_date ON asset_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_components_asset ON asset_components(asset_id);
  `); console.log("[DB] Schema initialized");
  } finally { c.release(); }
}

export async function seedIfEmpty() {
  const{rows}=await pool.query("SELECT COUNT(*) FROM utcs");
  if(parseInt(rows[0].count)>0) return;
  console.log("[DB] Seeding v5...");
  const c=await pool.connect();
  try { await c.query("BEGIN");
    // Settings
    for(const[k,v,l,d]of[["app_name","Combat Command","Application Name","Header name"],["app_short_name","CBCMD","Short Name","Abbreviated"],["app_description","Asset Management System","Description","Subtitle"],["org_name","","Organization","Your unit"]])
      await c.query("INSERT INTO system_settings (key,value,label,description) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",[k,v,l,d]);
    // Dropdowns
    const dds={category:["Laptop","Tablet","Radio","Monitor","Server","Switch","Router","Printer","Phone","Cable","Power Supply","Other"],status:["Ready to Deploy","Deployed","Pending","In Maintenance","Retired","Lost"],model:["ThinkPad X1","Surface Pro","AN/PRC-152","Dell U2722D","PowerEdge R740","Catalyst 9300","ISR 4321"],component_status:["Good","Damaged","Missing","Replacement Needed"]};
    for(const[n,vs]of Object.entries(dds))for(let i=0;i<vs.length;i++)await c.query("INSERT INTO dropdown_options (dropdown_name,value,display_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",[n,vs[i],i]);
    // Modules
    for(const[id,nm,de,ca,en]of[["mod_notes","Asset Notes","Comments on assets","core",true],["mod_warranty","Warranty Tracking","Track warranty dates","tracking",false],["mod_location","Location Tracking","Building/room tracking","tracking",false],["mod_custom_fields","Custom Fields","Custom data fields","advanced",true],["mod_bulk_ops","Bulk Operations","Batch operations","operations",true],["mod_audit_log","Audit Log","System audit trail","compliance",true],["mod_components","Sub-Inventory","Track components within assets","core",true],["mod_warehouse","Warehouse View","2D warehouse visualization","operations",true],["mod_documents","Documents","Upload docs per asset/INC","core",true],["mod_requirements","Requirements Tracking","Track required vs actual inventory","operations",true],["mod_maintenance","Maintenance Scheduling","Recurring tasks","operations",false],["mod_reports","Report Generator","PDF reports","reporting",false],["mod_depreciation","Depreciation","Track value over time","finance",false]])
      await c.query("INSERT INTO modules (id,name,description,category,is_enabled) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",[id,nm,de,ca,en]);
    // Custom fields
    for(const[n,k,t,o]of[["Purchase Date","purchase_date","date",""],["Purchase Price","purchase_price","number",""],["Warranty Expiry","warranty_expiry","date",""],["Condition","condition","select","New,Good,Fair,Poor"],["Location","location","text",""]])
      await c.query("INSERT INTO custom_fields (name,field_key,field_type,options,is_active) VALUES ($1,$2,$3,$4,true) ON CONFLICT DO NOTHING",[n,k,t,o]);

    // Warehouse: 4 cols x 3 rows
    for(const row of["A","B","C"])for(let col=1;col<=4;col++)
      await c.query("INSERT INTO warehouse_locations (id,row_label,col_number,label) VALUES ($1,$2,$3,$4)",
        [`${row}${col}`,row,col,`Shelf ${row}${col}`]);
    await c.query("INSERT INTO warehouse_locations (id,row_label,col_number,label) VALUES ($1,$2,$3,$4)",["SHOP","S",0,"Shop"]);
    await c.query("INSERT INTO warehouse_locations (id,row_label,col_number,label) VALUES ($1,$2,$3,$4)",["SHELTER","X",0,"Shelter"]);
    await c.query("INSERT INTO warehouse_locations (id,row_label,col_number,label) VALUES ($1,$2,$3,$4)",["DEPLOYED","D",0,"Deployed"]);

    // UTC + FCPs
    await c.query("INSERT INTO utcs (id,name,description) VALUES ($1,$2,$3)",["utc-1","UTC Alpha","Primary Unit"]);
    const fcpData=[["fcp-1","FCP 1","Deployed","A1"],["fcp-2","FCP 2","Ready to Deploy","B2"],["fcp-3","FCP 3","Ready to Deploy","C3"]];
    for(const[id,nm,st,wl]of fcpData)
      await c.query("INSERT INTO fcps (id,name,utc_id,status,warehouse_location_id) VALUES ($1,$2,'utc-1',$3,$4)",[id,nm,st,wl]);

    // Packages (kept for type classification)
    const pkgs=[["pkg-1","6KTGB 1","fcp-1","6KTGB"],["pkg-2","6KTGC 1","fcp-1","6KTGC"],["pkg-3","6KTGB 2","fcp-2","6KTGB"],["pkg-4","6KTGC 2","fcp-2","6KTGC"],["pkg-5","6KTGB 3","fcp-3","6KTGB"],["pkg-6","6KTGC 3","fcp-3","6KTGC"]];
    for(const p of pkgs) await c.query("INSERT INTO packages (id,name,fcp_id,type) VALUES ($1,$2,$3,$4)",p);

    // 8 Increments per FCP
    const reqTemplates=[
      {name:"Laptop",category:"Computing",qty:2,cost:1200},{name:"Tablet",category:"Computing",qty:1,cost:800},
      {name:"Radio AN/PRC-152",category:"Comms",qty:2,cost:4500},{name:"Switch Catalyst 9300",category:"Networking",qty:1,cost:3500},
      {name:"Server PowerEdge R740",category:"Server",qty:1,cost:8000},{name:"AC Power Cord",category:"Power",qty:4,cost:25},
      {name:"Cat6 Ethernet Cable",category:"Networking",qty:8,cost:15},{name:"SFP+ Module",category:"Networking",qty:2,cost:120},
    ];
    const models=["ThinkPad X1","Surface Pro","AN/PRC-152","Dell U2722D","PowerEdge R740","Catalyst 9300","ISR 4321","ThinkPad X1"];
    const cats=["Laptop","Tablet","Radio","Monitor","Server","Switch","Router","Laptop"];
    const statuses=["Deployed","Ready to Deploy","Pending","In Maintenance"];
    let assetN=1;
    for(const[fi,fcp]of fcpData.entries()){
      for(let inc=1;inc<=8;inc++){
        const incId=`inc-${fcp[0]}-${inc}`;
        await c.query("INSERT INTO increments (id,name,inc_number,fcp_id) VALUES ($1,$2,$3,$4)",[incId,`INC ${inc}`,inc,fcp[0]]);
        // Requirements for each INC
        for(const req of reqTemplates)
          await c.query("INSERT INTO increment_requirements (increment_id,item_name,category,required_qty,unit_cost) VALUES ($1,$2,$3,$4,$5)",[incId,req.name,req.category,req.qty,req.cost]);
        // Create 3 assets per INC
        const assetCount=inc<=3?3:2; // first 3 INCs get 3 assets, rest get 2
        for(let ai=0;ai<assetCount;ai++){
          const ci=(assetN-1)%8, id=`asset-${assetN}`, tag=`AT-${String(assetN).padStart(5,"0")}`;
          const ser=`SN-${Math.random().toString(36).substr(2,12).toUpperCase()}`;
          await c.query("INSERT INTO assets (id,asset_tag,serial,name,model,category,status,fcp_id,utc_id,increment_id,package_id,warehouse_location_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
            [id,tag,ser,`${cats[ci]} Unit`,models[ci],cats[ci],statuses[assetN%4],fcp[0],"utc-1",incId,pkgs[fi*2]?.[0]||null,fcp[3]]);
          await c.query("INSERT INTO asset_history (asset_id,action,user_name,details) VALUES ($1,$2,$3,$4)",[id,"Created","System","Seeded"]);
          // Components for switches/servers
          if(cats[ci]==="Switch"){
            await c.query("INSERT INTO asset_components (asset_id,name,quantity,category) VALUES ($1,$2,$3,$4)",[id,"AC Power Cord",2,"Power"]);
            await c.query("INSERT INTO asset_components (asset_id,name,quantity,category) VALUES ($1,$2,$3,$4)",[id,"Cat6 Cable",8,"Networking"]);
          }else if(cats[ci]==="Server"){
            await c.query("INSERT INTO asset_components (asset_id,name,quantity,category) VALUES ($1,$2,$3,$4)",[id,"AC Power Cord",2,"Power"]);
            await c.query("INSERT INTO asset_components (asset_id,name,quantity,category) VALUES ($1,$2,$3,$4)",[id,"Rail Kit",1,"Mounting"]);
          }
          assetN++;
        }
      }
    }
    await c.query("COMMIT");
    console.log(`[DB] Seeded ${assetN-1} assets, 24 INCs, 15 warehouse locations`);
  } catch(e){await c.query("ROLLBACK");throw e;} finally{c.release();}
}
export default pool;
