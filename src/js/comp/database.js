export class Database {
    constructor() {
          this.db = new Dexie("assignan_database");
          this.db.version(1).stores({
              goods: 'name,income,total,valPU,food,unstorable,consmod,luxmod',
              buildings: 'name,cost,number,yield_weekly,yield_const,value,buildable,variable',
              time: 'name,year,week',
              population: 'name,total,adult,infant,housings',
              capacity: 'name,resources,food,prodmod,actres,actfood,prodmod_housings,positive_sources,negative_sources',
              diplomacy: 'name,fame,arcane,fameinfo,actualfame',
              value: 'name,total,resources,buildings',
              webhook: 'name,hook'
          });
        //Loads Errorsound
        this.errorsnd = document.getElementById("errorsound");

        //Takes care of the possibility to load databases in case of missing data
        
        let btn_save = document.querySelector("button#save"),
            inp_load = document.querySelector("input#load"),
            btn_send = document.querySelector("button#send");

            btn_save.addEventListener("click", () =>{
                this.saveDB();
            });
            inp_load.addEventListener("change", (e) => {
                let reader = new FileReader();
                reader.addEventListener("load", (ev) => this.loadDB(ev.target.result));
                reader.readAsText(e.target.files[0]);
            });
            btn_send.addEventListener("click", () =>{
                this.sendDB();
            });
        //If there is no other possibility, one can recreate the village by uncommenting this command:
        
        //this.initDatabase();
        

        
        //If there is data available, the "json needed" message is cleared
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                this.update();
            }
        })

        //Initializes the Settings button (which wont run without data!)
        this.initSettings();
    };

    //Initializes the Database with certain values - shouldnt be used anymore, since data is loaded via external json
    async initDatabase() {
        this.assets = ["Wood","Stone","Silver","Marble","Glass","Gold","Grapes","Pottery","Furniture","Bread","Wheat","Beef","Fish","Spiritual Food","GP"];
        this.asset_num = [5475,25,12,220,625,5,40,60,0,1250,0,700,300,0,2658];
        this.asset_VPU = [1.5,3,50,10,4,100,2.5,2,6.5,0.1,0.1,0.3,0.2,0,1];
        this.asset_food = [false,false,false,false,false,false,true,false,false,true,false,true,true,false,false];
        this.unstorable = [false,false,false,false,false,false,false,false,false,false,false,false,false,true,false];
        this.consmod = [0,0,0,0,0,0,0.1,0,0,2,0,1,1,0,0];
        this.luxmod = [0,0,0,0,0,0,1,0,0,0,0,0,0,0,0];
        this.deficit = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]
        
        for (let i=0;i<this.assets.length;i++) {
            this.db.goods.put({name:this.assets[i],income:0,total:this.asset_num[i],valPU:this.asset_VPU[i],food:this.asset_food[i],
                unstorable:this.unstorable[i],consmod:this.consmod[i],luxmod:this.luxmod[i],deficit:this.deficit[i]});
        }
        let goods = await this.getAllGoods();

        this.infstr = ["House","Storehouse","Fishing Hut","Farm","Gristmill","Carpentry","Fiddler's Green","Silver Mine - unskilled Workers","Silver Mine - skilled Workers","Fishing Village - Paris","Chapel - Lancellin","Inn","Docks"];
        this.infstr_cost = [{"Wood":150,"Stone":100,"GP":475},{"Wood":450,"Stone":300,"GP":925},{"Wood":50,"Stone":20,"GP":140},
            {"Wood":500,"Stone":200,"GP":1900},{"Wood":100,"Stone":75,"GP":300},{"Wood":150,"Stone":100,"GP":550},
            {"Wood":125,"Stone":75,"GP":800},{},{},{},{"GP": 600},{"GP": 800},{"GP": 3000}];
        this.infstr_num  = [19,1,3,4,2,0,1,15,4,1,1,1,1];
        this.yield_weekly= [{},{},{"Fish": 48},{"Beef": 80, "Wheat": 100},{"Wheat": -200, "Bread": 200, "GP": 2},{"Wood": -4,"Furniture":4},{},{"Silver": 0.064},{"Silver": 0.4},{"Fish": 100},{"Spiritual Food":240},{},{}];
        this.yield_const = [{"Housings":8},{"StorRes": 15000, "StorFood": 30000},{},{"Housings":4},{},{},{},{},{},{},{},{},{}];
        this.buildable = [true,true,true,true,true,true,true,false,false,false,false,false,false];
        this.variable = [false,false,false,false,false,false,false,true,true,false,false,false,false]
        for (let j=0; j<this.infstr.length;j++) {
            let valueBuilding = 0;
            Object.keys(this.infstr_cost[j]).forEach(resource =>{
                valueBuilding += this.infstr_cost[j][resource]*goods[resource].valPU
            })

            this.db.buildings.put({name: this.infstr[j],cost:this.infstr_cost[j], 
                                    number: this.infstr_num[j],yield_weekly:this.yield_weekly[j],yield_const:this.yield_const[j],
                                    value: valueBuilding,buildable:this.buildable[j],variable:this.variable[j]})
        }
        await this.db.time.put({name:"Time",year: 1132, week:30,month: "Civius", date: 28});
        await this.db.population.put({name:"Population",total:167,adult:144,infant:23,housings:0});
        await this.db.capacity.put({name:"Capacity",resources:0,food:0,prodmod:100});
        
        await this.db.diplomacy.put({name:"Diplomacy",fame: 2,arcane:1,fameinfo:"",actualfame: 2});
        await this.db.value.put({name:"Value",total: 0,resources:0,buildings:0});
    };

    //Is called when important things happen and an update is necessary
    async update(){
        //Decision, whether a database/json was loaded
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                let loadtxt = document.querySelector("#loadfirst");
                loadtxt.className ="hidden";
            }});

        //Update date on the book
        let root = document.documentElement;
        let time_aux = await this.db.time.get("Time");
        let str = "'"+"Assignan " + time_aux.week +"/"+time_aux.year + " p.F."+"'";
        root.style.setProperty('--accent-content',str);

        //Update all databases gradually
        await this.createStatGoods();
        await this.createStatBuild();
        await this.computeWeeklyYield();
        await this.computeConstantYield();
        await this.createStatGoods();
        await this.createStatTot();
        await this.initSettings();
        await this.computeProdmodHousings();

        //Sets Information of hover over prodmod div
        let div_prodmod = document.getElementById("prodmod");
        div_prodmod.addEventListener("mouseover", async (el) => {
            el.target.value="";
            el.target.pattern="(\d|(\d,\d{0,2}))";
            let capDB = await this.db.capacity.get("Capacity");
            let titlestr = "Buffs:"+ (capDB.positive_sources==="" ? "\n---" : capDB.positive_sources) +
                            "\n\nDebuffs:"+ (capDB.negative_sources==="" ? "\n---" : capDB.negative_sources);
            el.target.title=titlestr
        });
    };

    //Initializing Settings page
    async initSettings() {
        
        //Manage line with items in settings screen
        await this.createItemsAdd();
        let add = document.getElementById("AddingGoods"),
            inputsItems = Array.from(add.querySelectorAll("input")),
            btn = add.querySelector("button"),
            ops = document.getElementById("opt");
        
        await btn.addEventListener("click", async () => {
            let inpValTot = inputsItems[1].value;
            if(!(inputsItems[0].value.length === 0 || inputsItems[1].value.length === 0)){
                if (ops.selectedOptions[0].text==="Remove") {
                     inpValTot *= -1;
                };
                await this.addGood(inputsItems[0].value,0,inpValTot*1,inputsItems[2].value*1,inputsItems[3].value*1,inputsItems[4].value*1);
            };
        });

        //Manage line with sources of income in settings screen
        await this.createBuildingsAdd();
        let buildAdd = document.getElementById("AddingBuilds"),
            inputsBuilds = Array.from(buildAdd.querySelectorAll("input")),
            selectsBuilds = Array.from(buildAdd.querySelectorAll("select")),
            btnBuild = buildAdd.querySelector("button");
        
        await btnBuild.addEventListener("click", async () => {
            this.db.transaction("rw",this.db.buildings, async () => {
                    this.db.buildings.put({name: inputsBuilds[0].value,cost:{}, number: 1,yield_weekly: {[selectsBuilds[1].value]: Number(inputsBuilds[2].value)},
                        yield_const: {[selectsBuilds[0].value]: Number(inputsBuilds[1].value)}, value: 0,buildable: false,variable:selectsBuilds[2].value})}).then(
                            async () => {await this.update(); await this.createStatBuild();}
                        );  
        });
    };

    //Create menu for adding items in settings screen
    async createItemsAdd() {
        let container = document.getElementById("settings");
        container.innerHTML="";
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id = "AddingGoods"
        head.innerHTML = "Add additional existing or completely new items";
        container.appendChild(head);

        //Options for already available items
        let inpName = document.createElement("input");
        let datalist = document.createElement("datalist");
        let goods = await this.getAllGoods();
        Object.keys(goods).forEach( name => {
            this.createOption(datalist,name,"");
        })
        datalist.id = "goodlist"
        inpName.setAttribute('list', "goodlist");
        inpName.placeholder="Add new item's name"
        inpName.type = "text"
        inpName.required = true
        inpName.id="inpName"
        Add.appendChild(datalist);
        Add.appendChild(inpName);

        //Add or Remove possibility
        let op = document.createElement("select");
        this.createOption(op,0,"Add");
        this.createOption(op,1,"Remove");
        op.id ="opt";
        Add.appendChild(op)

        //Create number inputs via outsourced function
        const placeholders = ["# of units (Storage!)","Value p.U.","Consumption Modifier","Luxury Modifier"],
              ids          = ["inpTotal","inpVal","inpConsmod","inpLuxmod"],
              titles       = ["In case of adding more items than available storage, you will add 0 units!",
                              "Only necessary in case of new items, otherwise it can be left blank.",
                              "Only necessary in case of new items, otherwise it can be left blank.\nHigher values means more importance, e.g.: Bread has 2, Beef and Fish 1",
                              "Only necessary in case of new items, otherwise it can be left blank.\nHigher value means more productivity bonus, e.g.: 1 = 5%"],
              required     = [true,false,false,false];
        for (let k in placeholders) { this.createInput(Add,placeholders[k],ids[k],titles[k],required[k]) };
        
        let btn = document.createElement("button");
        btn.innerHTML="▶"
        Add.appendChild(btn)
        container.appendChild(Add)
    }; 

    //Outsourced function for creating input fields
    async createInput(container,placeholder,id,title,required) {
        let inp            = document.createElement("input");
        inp.placeholder    = placeholder
        inp.type           = "number"
        inp.id             = id
        inp.required       = required
        inp.pattern        = "(\d|(\d,\d{0,2}))";
        inp.title          = title
        container.appendChild(inp);
    };

    //Outsourced function for options
    createOption(container,value,text) {
        let option          = document.createElement("option");
            option.value        = value;
            option.innerText    = text;
            container.appendChild(option);
    };

    //Create new buildings, which are not buildable, but possibly with variable worker number
    async createBuildingsAdd () {
        let container = document.getElementById("settings");
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id ="AddingBuilds";
        head.innerHTML = "Add new (unbuildable) sources of income";
        container.appendChild(head);
        let inpName = document.createElement("input");
        let builds = await this.getAllBuildings();
        inpName.placeholder="Add name"
        inpName.type = "text"
        inpName.required = true
        inpName.id="inpName"
        Add.appendChild(inpName);


        let optTotalYield = document.createElement("select"),
            incomes = {};
        builds.forEach(building => {incomes[building.name] = building.yield_const});
        let values = this.getConstantYieldNames(incomes),
            texts = ["---","Housings","Storage Resources","Storage Food"];
        values.unshift(0);
        for (let k in values) {
            this.createOption(optTotalYield,values[k],texts[k]);
        };
        Add.appendChild(optTotalYield)

        this.createInput(Add,"Constant Yield - Number","inpTotalYieldNumber","",false)

        let optWeeklyYield = document.createElement("select");
        this.createOption(optWeeklyYield,0,"---");
        let goods = await this.getAllGoods();
        Object.keys(goods).forEach(name => {
            this.createOption(optWeeklyYield,name,name);
        });
        Add.appendChild(optWeeklyYield)

        this.createInput(Add,"Weekly Income - Number","inpWeeklyYieldNumber","",false)

        let op = document.createElement("select");
        this.createOption(op,true,"Number variable");
        this.createOption(op,false,"Number fixed to 1");
        
        op.id ="optionsVary";
        Add.appendChild(op)

        let btn = document.createElement("button");
        btn.innerHTML="▶"
        Add.appendChild(btn)

        container.appendChild(Add);
    };

    //Takes care of correct year/month
    async timeManager() {
        let time = await this.db.time.get("Time");
        if (time.week === 41) {time.year +=1; time.week = 1} else {time.week += 1};
        let months = {"Thex": 42, "Cesyn": 40, "Lugh": 41, "Athos": 45, "Hania": 37, "Civius": 41, "Mannanán": 40, "Nemnir": 42},
            days = time.week * 8,
            j = 0;
        while (days > 45){
            days -= Object.values(months)[j]
            j += 1
        };
        time.month = Object.keys(months)[j]
        time.date = days-7
        await this.db.time.put(time)
    };

    //Adds the necessary calculations to the weekPassed function
    weekPassedComputations() {
        return this.db.transaction("rw",this.db.population,this.db.diplomacy,this.db.goods,this.db.capacity, async ()=>{
            let goods = await this.getAllGoods();
            let diplDB = await this.db.diplomacy.get("Diplomacy"), popsDB = await this.db.population.get("Population"),
                capDB = await this.db.capacity.get("Capacity");

            Object.keys(goods).forEach(res =>{
                if (goods[res].unstorable ) {
                    goods[res].total = 0;
                }
                //Manage food first
                else if (goods[res].food ) {
                    if (goods[res].income > capDB.food - capDB.actfood ) {
                        goods[res].total += - capDB.actfood + capDB.food ;
                    }
                    else if (goods[res].total < goods[res].income && goods[res].income < 0){
                        goods[res].total = 0;
                    }
                    else {
                        goods[res].total += goods[res].income;
                    };
                }
                //then manage general resources
                else {
                    if (goods[res].income > capDB.resources - capDB.actres ) {
                        goods[res].total += - capDB.actres + capDB.resources ;
                    }
                    else if (goods[res].total < goods[res].income && goods[res].income < 0){
                        goods[res].total = 0;
                    }
                    else {
                        goods[res].total += goods[res].income;
                    };
                };
            });
            await this.db.goods.bulkPut(Object.values(goods));

            //Update growth of population
            popsDB.adult += 0.75*diplDB.actualfame;
            popsDB.infant+= 0.25*diplDB.actualfame;
            popsDB.total = popsDB.adult + popsDB.infant;

            await this.db.population.put(popsDB);
            await this.computeProdmodHousings();
        })
    };

    //Computes prodmod housings
    async computeProdmodHousings() {
        return this.db.transaction("rw",this.db.population,this.db.capacity, async ()=>{
            let popsDB = await this.db.population.get("Population"),
            capDB = await this.db.capacity.get("Capacity");

            //Debuff for production in case of missing housings
            if (popsDB.total > popsDB.housings){
                capDB.prodmod_housings = - ((popsDB.total - popsDB.housings)*100 / popsDB.housings).toFixed(0);
            }
            else {
                capDB.prodmod_housings = undefined;
            };
            await this.db.population.put(popsDB);
            await this.db.capacity.put(capDB);
        }).catch(err => {
            console.error(err.stack)
        });
    };

    //Gathers information from subfunctions and executes them
    async weekPassed() {
        await this.update();
        await this.weekPassedComputations();
        let time = await this.timeManager();
        //Restrict sounds to the production modifier of the incoming week, not the passed one.
        this.update().then(async ()=>{
            let cap_aux = await this.db.capacity.get("Capacity");
            
            //Plays sound dependent on happiness in the village
            if (cap_aux.prodmod <= 50) {
                let riotsnd = document.getElementById("riotingsound");
                riotsnd.play();
            }
            else if (cap_aux.prodmod > 100) {
                let cheersnd = document.getElementById("cheeringsound");
                cheersnd.play();
            }
            else {
                let snd = document.getElementById("roostersound");
                snd.play();
            };
        });
    };

    //Creates default page and computes current value of several assets and in total
    async createStatTot() {
        let time_aux = await this.db.time.get("Time");
        let container = document.getElementById("stat-tot");
        container.innerHTML="";
        let cell1 = document.createElement("div"),
                head = document.createElement("h1");
        head.style = "white-space: pre"
        head.innerHTML = "Assignan\n\n"+time_aux.month+" Day "+time_aux.date
        head.align = "center"
        let img = document.createElement("img");
        img.src = "./src/images/Wappen_Assignan.PNG"
        img.style.height = '200px'; img.style.width = '200px';
        img.align="right"
        img.margin = "3vh"
        cell1.appendChild(img)
        container.appendChild(head)
        container.appendChild(cell1)
        
        let     pop = document.createElement("div"), 
                cap = document.createElement("div"),
                dipl = document.createElement("div"),
                val = document.createElement("div");

        let pop_aux  = await this.db.population.get("Population"),
            cap_aux  = await this.db.capacity.get("Capacity"),
            dipl_aux = await this.db.diplomacy.get("Diplomacy"),
            val_aux  = await this.db.value.get("Value");

        val_aux.total = val_aux.buildings + val_aux.resources
        await this.db.value.put(val_aux);
        //Creating strings for cells with correct formatting
        pop.style = "white-space: pre"; pop.innerHTML="&#127968;\t-\t"+pop_aux.housings+"\t\t\t\t👪\t-\t"+pop_aux.total.toFixed(0)+"\n🧑\t-\t"+pop_aux.adult.toFixed(0)+"  \t\t\t🧒\t-\t"+pop_aux.infant.toFixed(0);
        if (pop_aux.housings<pop_aux.total) {
            pop.style = "white-space: pre; color: red"
        };
        container.appendChild(pop); 
        
        cap.style = "white-space: pre"; cap.innerHTML = "Storage"+"\t\t&#129717;\tused\t"+cap_aux.actres.toFixed(2)+"\tof\t"+cap_aux.resources+"\n\t\t\t&#127828;\tused\t"+cap_aux.actfood.toFixed(2)+"\tof\t"+cap_aux.food; container.appendChild(cap);
        dipl.style = "white-space: pre"; dipl.innerHTML="☆\t-\t"+dipl_aux.actualfame+"\t"+dipl_aux.fameinfo+"\n🗲\t-\t"+dipl_aux.arcane; container.appendChild(dipl);
        val.style = "white-space: pre"; val.innerHTML = "\&#129689; \tin \ttotal\t" + val_aux.total.toFixed(2) + "\n\tin\t&#127828;&#129717\t" + val_aux.resources.toFixed(2) + "\n\tin\t&#127968;&#127970;\t" + val_aux.buildings.toFixed(2); container.appendChild(val);
        let prod = document.getElementById("prodmod");
        prod.innerHTML = "&#9881; "+cap_aux.prodmod+" %"
    };

    //Save the databases as file
    async saveDB() {
        let file = new Blob( [JSON.stringify({
            goods:      await this.db.goods.toArray(),
            buildings:  await this.db.buildings.toArray(),
            time:       await this.db.time.toArray(),
            population: await this.db.population.toArray(),
            capacity:   await this.db.capacity.toArray(),
            diplomacy:  await this.db.diplomacy.toArray(),
            value:      await this.db.value.toArray()
        },null,4)],{type: "application/json"});
        const a= document.createElement("a");

        a.href = URL.createObjectURL(file);
        a.download = "Assignan_databases_"+ (new Date()).toDateString().replaceAll(" ", "_")+".json";
        a.click();

        URL.revokeObjectURL(a.href);
    };

    //Loads databases via uploaded file
    async loadDB(file) {
        return this.db.transaction("rw",this.db.goods,this.db.buildings,this.db.time,this.db.population, this.db.capacity, this.db.diplomacy, this.db.value,this.db.webhook, async() => {
            const data = JSON.parse(file);
            await this.db.goods.clear();
            await this.db.buildings.clear();
            await this.db.time.clear();
            await this.db.population.clear();
            await this.db.capacity.clear();
            await this.db.diplomacy.clear();
            await this.db.value.clear();
            await this.db.webhook.clear();
            await Promise.all(Object.entries(data).map(([key, val]) => {
                return this.db[key].bulkPut(val);
            }));
        }).then(async ()=> await this.update());
        
    };

    //Sends databases to Discord
    async sendDB() {
        
        let file = new Blob( [JSON.stringify({
            goods:      await this.db.goods.toArray(),
            buildings:  await this.db.buildings.toArray(),
            time:       await this.db.time.toArray(),
            population: await this.db.population.toArray(),
            capacity:   await this.db.capacity.toArray(),
            diplomacy:  await this.db.diplomacy.toArray(),
            value:      await this.db.value.toArray(),
            webhook:    await this.db.webhook.toArray()
        },null,4)],{type: "application/json"});

        let namestr = "Assignan_databases_"+ (new Date()).toDateString().replaceAll(" ", "_")+".json";
        let comment = prompt('You are sending the current state of Assignan to the Discord server.\nAdd comments, if necessary:');
        if (comment === null){
            return
        }
        const xhr = new XMLHttpRequest();
        const params = {
            username: "Ereldra Naerth",
            avatar_url: "https://cdn.discordapp.com/attachments/703997704392409139/864280074201858118/Lady_Ereldra_Naerth.jpg",
            content: "Report on Assignan's current status:",
            attachments: [{
                "id": 0,
                "description": "Report",
            }],
            embeds: [{
                "title": "Comments:",
                "color": 16776960,
                "description": "*None*"
            }]
        };
        console.log(comment)
        if (comment){
            params.embeds = [{
                "title": "Comments:",
                "color": 16776960,
                "description": comment
            }]
        };
        let hook = await this.db.webhook.get("Webhook")
        xhr.open("POST", hook.hook,true);
        var boundary = '---------------------------';
        boundary += Math.floor(Math.random()*32768);
        boundary += Math.floor(Math.random()*32768);
        boundary += Math.floor(Math.random()*32768);
        xhr.setRequestHeader("Content-Type", 'multipart/form-data; boundary=' + boundary);
        var body = '';
        body += '--' + boundary + '\r\n' + 'Content-Disposition: form-data; name="';
        body += "payload_json";
        //body += "\r\nContent-Type: application/json"
        body += '"\r\n\r\n';
        body += JSON.stringify(params);
        body += '\r\n'
        body += '--' + boundary + '\r\n' + 'Content-Disposition: form-data; name="';
        body += 'files[0]"; filename='+ namestr +"\r\nContent-Type: text/plain"+ '\r\n\r\n'
        body += JSON.stringify({
            goods:      await this.db.goods.toArray(),
            buildings:  await this.db.buildings.toArray(),
            time:       await this.db.time.toArray(),
            population: await this.db.population.toArray(),
            capacity:   await this.db.capacity.toArray(),
            diplomacy:  await this.db.diplomacy.toArray(),
            value:      await this.db.value.toArray(),
            webhook:    await this.db.webhook.toArray()
        },null,4);
        body += '\r\n'
        body += '--' + boundary + '--';
        xhr.onload = function() {
        }
        xhr.send(body);
    };

    //Creates Statistic page for goods and computes total value of goods for default page
    async createStatGoods() {
        let container = document.getElementById("stat-goods");
        container.innerHTML="";

        //Create header of table "goods" by subfunction
        this.createCells(container, ["Goods", "Total Number", "Income per Week", "Value per Unit in GP", "Total value of this asset"]);
        this.createLine(container,5);

        //Fill the table with values from database
        let valueGoods = 0,
            storGoods = 0,
            storFood = 0;
        let goods = await this.getAllGoods();

        //Coloring of income depending on production modifier
        const cap_aux = await this.db.capacity.get("Capacity");
        
        for (let good of Object.values(goods)) {
            valueGoods+=good.total*good.valPU;
            storGoods += good.total
            let col = "", problems = undefined;
            if (cap_aux.prodmod < 100) {
                col = "red";
            }
            else if (cap_aux.prodmod > 100) {
                col = "green";
            };
            if (good.deficit != undefined) {
                if (good.deficit[0] != undefined) {
                col = "#ff8888";
                problems = good.deficit;
                };
            };
            this.createCells(container,[good.name,good.total.toFixed(2),good.income.toFixed(2),good.valPU,(good.total*good.valPU).toFixed(2)],col,undefined,problems);
        };

        Object.keys(goods).forEach(key => {
            if (goods[key].food) {
                storFood += goods[key].total
            };
        });
        storGoods -= storFood;
        Object.keys(goods).forEach(key => {
            if (key.includes("GP")){
                storGoods -= goods[key].total;
            }
        })
        let aux_val = await this.db.value.get("Value");
        aux_val.resources = valueGoods;
        await this.db.value.put(aux_val)
        let aux_cap = await this.db.capacity.get("Capacity");
        aux_cap.actres = storGoods;
        aux_cap.actfood = storFood;
        await this.db.capacity.put(aux_cap)
    };

    //Extract the cell creation in the tables
    createCells(cont,list, color,align,problems) {
        for (let i =0; i<list.length;i++) {
            let cell = document.createElement("div");
            cell.className = "cell";
            cell.style = (align!=undefined ? "text-align: center" : "");
            cell.innerHTML = list[i];
            if (color != undefined && i === 2) {
                cell.style.color = color;
            };
            if (problems != undefined) {
                console.log(problems);
                cell.addEventListener("mouseover", async (el) => {
                el.target.value="";
                let titlestr = "Problems in supply chain with\n"
                problems.forEach(prob => {titlestr += "- "+prob + "\n"})
                el.target.title=titlestr
                })};
            cont.appendChild(cell);
        };
    };

    //Extract empty line creation
    createLine(cont,numb){
        for (let i=0;i<numb;i++){
            let hr = document.createElement("hr");
            hr.style = "color: transparent";
            cont.appendChild(hr);
        };
    };

    //Creates the statisticspage for buildings and computes their total value
    async createStatBuild() {
        let container = document.getElementById("build");
        container.innerHTML="";
        
        this.createCells(container, ["Building","Cost","Number","Yield","Build"],undefined,true);
        this.createLine(container,5);

        let valueBuildings = 0;
        let builds = await this.getAllBuildings();
        let goods = await this.getAllGoods();
        let pops = await this.db.population.get("Population");
        for (let build of builds ) {
            let cell3 = document.createElement("div"),
                cell5 = document.createElement("div"),
                btn = document.createElement("button"),
                slct = document.createElement("select");
            let aux = build
            valueBuildings += aux.value*aux.number
             
            let txt_cost ="";
            for (let x in aux.cost) {
                txt_cost += x+": "+aux.cost[x] +" ";
            };
            this.createCells(container,[aux.name,txt_cost]);
            
            if (aux.variable) {
                for (let i = 0;i<=pops.adult.toFixed(0);i++) {
                    let opt = document.createElement("option");
                    opt.value = i;
                    opt.innerText = i;
                    if(i === aux.number) {opt.selected = "selected"};
                    slct.style = "text-align: center";
                    slct.appendChild(opt);
                };
                slct.addEventListener("change", async (e)=> {
                    aux.number = slct.value*1;
                    await this.db.buildings.put(aux);
                    await this.update();
                });
                container.appendChild(slct);
            }
            else {
                cell3.className = "cell";
                cell3.style = "text-align: center";
                cell3.innerHTML = aux.number;
                container.appendChild(cell3);
            };

            cell5.className = "cell"
            let txt_yield = "";
            //Create strings in subfunctions
            txt_yield += this.iterateYields(aux.yield_weekly,"<strong>Weekly yield:</strong>");
            txt_yield += this.iterateYields(aux.yield_const,"<strong>Constant yield:</strong>");
            cell5.style = "white-space: pre; text-align: center";
            cell5.innerHTML = txt_yield
            container.appendChild(cell5)

            if (aux.buildable === true) {
                btn.innerHTML   = "Build"
                btn.id          = "btn-build-"+aux.name
                const buildable = Object.keys(aux.cost).every(resName => goods[resName].total >= aux.cost[resName]);
                let defic = {};
                Object.keys(aux.cost).forEach(resName => {
                    const diff = goods[resName].total - aux.cost[resName];
                    if (diff < 0) {
                        defic[resName]= diff;
                    };
                });
                btn.className = buildable ? "build buildable" : "build nonbuildable";
                //Show missing resources when hovering
                btn.addEventListener("mouseover", (el) => {
                    el.target.value="";
                    el.target.pattern="(\d|(\d,\d{0,2}))";
                    let titlestr = buildable ? "" : "Missing resources:\n";
                    Object.keys(defic).forEach(key => {
                        titlestr += key+": "+defic[key]+"\n";
                    })
                    el.target.title=titlestr
                });
                btn.addEventListener("click", ()=>this.buildBuilding(aux.name,1))
                container.appendChild(btn)
            }
            else{
                let btncell = document.createElement("div");
                btncell.innerHTML="";
                container.appendChild(btncell);
            };
            };
        let aux_val = await this.db.value.get("Value");
        aux_val.buildings = valueBuildings;
        await this.db.value.put(aux_val)
    };

    //Subfunction to shorten createStatBuild function
    iterateYields(obj,str) {
        if (Object.keys(obj) != 0) {
            let txt ="";
            for (let x in obj) {
                txt += x+": "+obj[x] +" ";
            };
            return str+"\n"+txt+"\n"
        }
        else {
            return ""
        };
    };

    //Computes the yield per week writes them into the goods database including computation of food consumption and (de-)buffs on production modifier
    computeWeeklyYield() {
        return this.db.transaction("rw",this.db.population,this.db.goods,this.db.buildings,this.db.capacity,this.db.diplomacy, async()=>{
            let incomes = {},
                number = {};
            (await this.getAllBuildings()).forEach(building => {incomes[building.name] = building.yield_weekly, number[building.name]=building.number});
            let goods = await this.getAllGoods();
            let cap_aux = await this.db.capacity.get("Capacity");
            const pops = await this.db.population.get("Population");
            //One week has 8 days on Caeldaria
            let cons = 8*(pops.adult+0.5*pops.infant);
            let goods_aux = {...goods};
            Object.keys(goods_aux).forEach(resource => {goods_aux[resource].income = 0});
            Object.keys(incomes).forEach(building => {Object.keys(incomes[building]).forEach((resource,i) => {
                goods_aux[resource].income += Object.values(incomes[building])[i]*number[building];
                if (goods_aux[resource].total < 0 ) {
                    goods_aux[resource].total = 0
                };
                goods_aux[resource].deficit = [];
            })});
            // Check for consumption of goods by buildings
            let incs = {};
            console.log(incomes)
            Object.keys(incomes).forEach(k_inc =>{
                Object.keys(incomes[k_inc]).forEach( k => {
                    if (incomes[k_inc][k] < 0) {
                        if (incs[k] === undefined) {
                            incs[k] = [k_inc]
                        }
                        else {
                            incs[k].push(k_inc)
                        };
                    };
                })
            });
            console.log(incs)
            console.log(goods_aux)
            Object.values(goods_aux).forEach(good => {
                if (good.total + good.income < 0) {
                    incs[good.name].forEach(building => {
                        //console.log("Building",building)
                        Object.keys(incomes[building]).forEach(res => {
                            //console.log("Res",res)
                            if (res != good.name) {
                                //console.log(good.name, good.income)
                                //console.log(res,incomes[building][res]*number[building])
                                //console.log((incomes[building][good.name]*number[building]))
                                goods_aux[res].income -= incomes[building][res]*number[building] * (1+(good.total)/goods_aux[good.name].income);
                                (goods_aux[res].deficit).push(good.name)
                            }
                        })
                    });
                    
                }
            })
            let food = [], 
                consmod = [],
                consmod_tot = 0,
                luxmod_tot = 0;
            Object.keys(goods_aux).forEach( key => {
                if (goods_aux[key].food && goods_aux[key].total + goods_aux[key].income > 0) {
                    food.push(key);
                    consmod.push(goods_aux[key].consmod);
                    consmod_tot += goods_aux[key].consmod;
                    luxmod_tot += goods_aux[key].luxmod;
                };
            });
            //Managing food consumption with careful attention to the production modifier => define a variable which stores the consumption temporarily in order to compute correctly the production modifier on the incomes
            cons -= goods_aux["Spiritual Food"].income
            let income_consum_mod = {},
                lux_consum_mod = {};
            for (let i in food) {
                income_consum_mod[food[i]] = - cons*consmod[i]/consmod_tot;
            };
            Object.keys(goods_aux).forEach( key => {
                if(goods_aux[key].total != 0 && goods_aux[key].total + goods_aux[key].income + income_consum_mod[key] < 0 && goods_aux[key].income + income_consum_mod[key]<0) {
                    lux_consum_mod[key] = Math.abs((goods_aux[key].total + goods_aux[key].income)/income_consum_mod[key]);
                    income_consum_mod[key] = - goods_aux[key].total;
                };
            });

            //Managing debuffs in case of missing food proportional to the importance of the food and also the luxury food
            //Idea: Even if there are not enough luxury goods to supply all inhabitants (such that it is set to 0 in the lines above), there should still be a boost of economy for one week
            //          proportional to the fraction of consumption and production.
            let prodmod = 100;
            cap_aux.negative_sources = "";
            cap_aux.positive_sources = "";
            if (cap_aux.prodmod_housings != undefined) {
                prodmod += cap_aux.prodmod_housings;
                cap_aux.negative_sources += "\nMissing Housings"
            };
            for (let i in food) {
                if (goods_aux[food[i]].total + goods_aux[food[i]].income + income_consum_mod[food[i]] < 0 && goods_aux[food[i]].luxmod === 0) {
                    prodmod -= (consmod[i]/consmod_tot).toFixed(2)*100;
                    cap_aux.negative_sources += "\nFood - "+food[i]
                }
                else if (goods_aux[food[i]].luxmod != 0) {
                    if (lux_consum_mod[food[i]] != undefined) {
                        prodmod += goods_aux[food[i]].luxmod*5*lux_consum_mod[food[i]]
                    }
                    else {
                        prodmod += goods_aux[food[i]].luxmod*5
                    };
                    cap_aux.positive_sources += "\nLuxury good - " + food[i]
                };
            };
            cap_aux.prodmod = prodmod.toFixed(0);
            await this.computeFameModifier(cap_aux.prodmod);
            //Since the food for this week is already consumed, we dont recompute the food income based on the total, but on the left income AFTER the village has eaten
            Object.keys(goods_aux).forEach(item => {
                goods_aux[item].income *= cap_aux.prodmod / 100;  
            });

            //Lancellins Food production isnt affected by this
            goods_aux["Spiritual Food"].income /= cap_aux.prodmod / 100;
            Object.keys(income_consum_mod).forEach(item =>{
                goods_aux[item].income += income_consum_mod[item]
            });
            
            await this.db.capacity.put(cap_aux);
            goods = {...goods_aux};
            //Rounding all values of goods once per update call
            Object.keys(goods).forEach(item => {
                goods[item].total = (goods[item].total).toFixed(3)*1;
                goods[item].income = (goods[item].income).toFixed(3)*1;
            });
            await this.db.goods.bulkPut(Object.values(goods));
        }).catch(err => {
            console.error(err.stack);
        });
    };

    //Updates the fame related things
    async computeFameModifier(prodmod) {
        return this.db.transaction("rw",this.db.diplomacy, async()=>{
            let diplDB = await this.db.diplomacy.get("Diplomacy");
            if (prodmod <= 50) {
                diplDB.actualfame = diplDB.fame*prodmod/100;
                diplDB.fameinfo = "The village disintegrates!"
            }
            else if (prodmod > 100) {
                diplDB.actualfame = diplDB.fame*(1 + (prodmod-100)*10/100);
                diplDB.fameinfo = "The village is prospering!";
            }
            else {
                diplDB.fameinfo = "";
                diplDB.actualfame = diplDB.fame;
            };
            await this.db.diplomacy.put(diplDB);
        }).catch(err => {
            console.error(err.stack);
        });
    };

    //Computes the constant yields and writes them into the stat overall databases
    computeConstantYield() {
        return this.db.transaction("rw",this.db.capacity,this.db.population,this.db.buildings, async()=>{
            let incomes = {},
                number = {},
                auxYield = {"housings":0,"resources":0,"food":0},
                aux_stor = await this.db.capacity.get("Capacity"),
                aux_pop = await this.db.population.get("Population");

            (await this.getAllBuildings()).forEach(building => {incomes[building.name] = building.yield_const, number[building.name]=building.number});
            let names = this.getConstantYieldNames(incomes);
            Object.keys(incomes).forEach( building =>{
                let m = 0;
                for (let key of Object.keys(auxYield)) {
                    if (incomes[building][names[m]] != undefined) {
                        auxYield[key]+=incomes[building][names[m]]*number[building]
                    };
                    m++;
                };
            });
            
            aux_stor.food = auxYield.food;
            aux_stor.resources = auxYield.resources;
            aux_pop.housings = auxYield.housings;
            await this.db.capacity.put(aux_stor);
            await this.db.population.put(aux_pop);
        }).catch(err => {
            console.error(err.stack);
        });
    };

    //Get constant yields from existing buildings
    getConstantYieldNames(incomes){
        let names = [];
        Object.values(incomes).forEach( item =>{
            if (Object.keys(item) != 0) {
                Object.keys(item).forEach(yie => {
                    names.push(yie)
                });
            };
        });
        return names = [...new Set(names)];
    };

    //Builds a certain building "number" times and removes the necessary goods from the database
    async buildBuilding (name, number){
        let snd = document.getElementById("buildingsound");
        this.db.transaction("rw",this.db.goods,this.db.buildings, async()=>{
            const building = await this.db.buildings.get(name),
                requiredGoods = Object.keys(building.cost),
                goods = {};
            (await this.db.goods.bulkGet(requiredGoods)).forEach((resource, i) => goods[requiredGoods[i]] = resource)
            const buildable = requiredGoods.every(resourceName => goods[resourceName].total >= building.cost[resourceName])
            if(!buildable) {
                return
            }
            snd.play();
            requiredGoods.forEach(resourceName => goods[resourceName].total -= building.cost[resourceName])
            await this.db.goods.bulkPut(Object.values(goods))
            building.number += number
            await this.db.buildings.put(building)
        }).then( async () => { 
            await this.update();
        }).catch(err => {
            console.error(err.stack)
        })
        
    };

    //Resets the properties of a certain good !!!CAUTION!!! Former information will be overwritten
    async putGood (Name,newInc,newTot){
        await this.db.goods.put({name: Name, income: newInc, total: newTot});
        this.update();
    };

    //Adds a particular income or total to a certain (possibly new) good
    async addGood (Name,addInc,addTot,valPU,foodmod,luxmod){
        this.db.transaction("rw",this.db.goods,this.db.capacity, async () => {
            let aux = await this.db.goods.get(Name),
                cap = await this.db.capacity.get("Capacity");
            let foodbol = false;

            if (aux ===undefined) {
                if (foodmod != 0) {
                    foodbol = true;
                };
                if (foodbol === true) {
                    if (addTot > cap.food - cap.actfood ) {
                        addTot = 0;
                        this.errorsnd.play();
                    };
                }
                else {
                    if (addTot > cap.resources - cap.actres ) {
                        addTot = 0;
                        this.errorsnd.play();
                    };
                }
                await this.db.goods.put({name: Name, income: addInc, total: addTot,valPU:valPU,unstorable:false,food:foodbol,consmod:foodmod,luxmod:luxmod});
            }
            else{
                //Takes care of storage capacities
                let sum = aux.total + addTot;
                if (sum < 0) {
                    aux.total = 0;
                    this.errorsnd.play();
                }
                //Exclude gold pieces as only good, which is stored outside the storage houses
                else if (Name.includes("GP")) {
                    aux.total += addTot;
                }
                else if (addTot > cap.resources - cap.actres && !aux.food) {
                    addTot = 0 ;
                    this.errorsnd.play();
                }
                else if (addTot > cap.food - cap.actfood && aux.food) {
                    addTot = 0;
                    this.errorsnd.play();
                }
                else {
                    aux.total += addTot;
                };
                await this.db.goods.put(aux);
            }
        }).then(this.update())
    };

    //Gives information about all goods
    async getAllGoods () {
        let aux = await this.db.goods.toArray(),
            goods = {};
        aux.forEach((res)=> {goods[res.name] = res});
        return goods;
    };

    //Gives information about a specific good - for debugging purposes
    async getGood (Name) {
        let aux = await this.db.goods.get(Name);
        return aux;
    };

    //Gives information about all buildings
    async getAllBuildings () {
        return await this.db.buildings.toArray();
    };

    //Gives information about a specific building - for debugging purposes
    async getBuilding (Name) {
        let aux = await this.db.buildings.get(Name);
        return aux;
    };
}