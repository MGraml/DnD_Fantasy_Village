import {dragElement,showDrags} from "./transition.js";

export class Database {
    constructor() {
        this.declareDatabase("village_database");

        this.tablenames = [];
        this.db.tables.forEach(table => {
            this.tablenames.push(table.name);
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

        //Introduce send button for messages
        let msg_button = document.getElementById("msgSend_button"),
            radios = Array.from(document.getElementsByName("receiver")),
            rec = this.checkReceivers(radios);
        radios.forEach( (rad) => {
            rad.addEventListener("click", () => {
                rec=this.checkReceivers(radios);
            })
        });
        const sender_sel = document.getElementById("senders"),
            msg_inp = document.querySelector("#message_text");

        msg_button.addEventListener("click", async () => {
            switch(rec) {
                case "Discord":
                    await this.sendMsgviaDiscord(sender_sel,msg_inp);
                    break;
                case "Email":
                    this.sendMsgviaEmail(sender_sel,msg_inp);
                    break;
            };
        });
        //Contact adding
        document.getElementById("addcontact_button").addEventListener("click", async () => {await this.addContact(); await this.fillContacts();});

        //If there is no other possibility, one can recreate the village by this command:
        //this.initDatabase();
        

        
        //If there is data available, the "json needed" message is cleared
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                this.update();
            }
        })

        //Initializes the Settings button (which wont run without data!)
        this.initSettings();
        this.protocol_list = [];
    };

    //Declares database
    declareDatabase(db_name){
        this.db = new Dexie(db_name);
        this.db.version(1).stores({
            goods: 'name,income,total,valPU,food,unstorable,consmod,luxmod',
            buildings: 'name,cost,number,yield_weekly,yield_const,value,buildable,variable',
            time: 'name,year,week',
            population: 'name,total,adult,infant,housings',
            capacity: 'name,resources,food,prodmod,actres,actfood,prodmod_housings,positive_sources,negative_sources',
            diplomacy: 'name,fame,arcane,fameinfo,actualfame',
            value: 'name,total,resources,buildings',
            webhook: 'name,hook',
            adresses: 'name,avatar',
            relations: 'name,relval,treaty,income,problems',
            basics: 'name,villagename,avatar,calendar'
        });
    };

    //Initializes the Database with certain values - deprecated, since data is loaded via external json
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
        await this.db.webhook.put({name:"Webhook",hook:"---"});
        await this.db.adresses.put({name:"Lady Ereldra Naerth",avatar:"---"});
        await this.db.relations.put({name:"Aurora",relval:-50,treaty:"---",income:{}});
    };

    //Is called when important things happen and an update is necessary
    async update(){
        //Decision, whether a database/json was loaded
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                let loadtxt = document.querySelector("#loadfirst");
                loadtxt.className ="hidden";
            }});

        let basics_aux = await this.db.basics.get("Basics");
        //Update date on the book
        let root = document.documentElement;
        let time_aux = await this.db.time.get("Time");
        let str = "'"+ basics_aux.villagename +" " + time_aux.week +"/"+time_aux.year + " p.F."+"'";
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
        await this.createRelationsTable();

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
        this.createProtocol();
        await this.fillContacts();
    };

    //Initializing Settings page
    async initSettings() {
        let container = document.getElementById("settings");
        container.innerHTML="";
        //Manage line with items in settings screen
        await this.createItemsAdd();
        let add = document.getElementById("AddingGoods"),
            inputsItems = Array.from(add.querySelectorAll("input")),
            btn = add.querySelector("button"),
            ops = document.getElementById("opt_itemadd");
        
        await btn.addEventListener("click", async () => {
            console.log(inputsItems)
            if (inputsItems[0].value != "") {
                let inpValTot = +inputsItems[1].value;
                if (ops.selectedOptions[0].text==="Remove") {
                        inpValTot *= -1;
                };
                await this.addGood(inputsItems[0].value,+inpValTot,+inputsItems[2].value,+inputsItems[3].value,+inputsItems[4].value);
                if (inpValTot*1 > 0) {
                    this.protocol_list.push(inputsItems[1].value + " " + inputsItems[0].value+" were added to the storehouses.")
                }
                else {
                    this.protocol_list.push(inputsItems[1].value + " " + inputsItems[0].value+" were removed from the storehouses.")
                };
                    
            }
            else {
                this.errorsnd.play();
            };
        });
        //Manage line with sources of income in settings screen
        await this.createBuildingsAdd();
        let buildAdd = document.getElementById("AddingBuilds"),
            inputsBuilds = Array.from(buildAdd.querySelectorAll("input")),
            selectsBuilds = Array.from(buildAdd.querySelectorAll("select")),
            btnBuild = document.getElementById("btnBuild");
            
        await btnBuild.addEventListener("click", async () => {
            this.db.transaction("rw",this.db.buildings, async () => {
                let constyield_holder = {},
                    weeklyyield_holder = {};
                if (selectsBuilds[0].value != "0") {
                    constyield_holder = {[selectsBuilds[0].value]: Number(inputsBuilds[1].value)};
                };
                if (selectsBuilds[1].value != "0") {
                    weeklyyield_holder = {[selectsBuilds[1].value]: Number(inputsBuilds[2].value)};
                };
                    this.db.buildings.put({name: inputsBuilds[0].value,cost:{}, number: 1,yield_weekly: weeklyyield_holder,
                        yield_const: constyield_holder, value: 0,buildable: false,variable:selectsBuilds[2].value})}).then(
                            async () => {
                                this.protocol_list.push("The new building "+inputsBuilds[0].value+" was added to the village.")
                                await this.update();
                                }
                            );  
        });
        await this.createRelationsAdd();
        let inpNation = document.getElementById("inpNation"),
            inpRel = document.getElementById("inpRel"),
            inpTreaty = document.getElementById("inpTreaty"),
            relAddInc = document.getElementById("relAddInc"),
            btnRel = document.getElementById("btnRel");

        await btnRel.addEventListener("click", async () => {
            if (inpRel.value === "") {
                inpRel.value = "?";
            };
            if (relAddInc.value == undefined) {
                relAddInc.value = {};
            };
            if (inpNation.value != "") {
                this.db.relations.put({name: inpNation.value,relval: +inpRel.value, treaty: inpTreaty.value, income: relAddInc.value, problems: ""});
                this.protocol_list.push("The relation with " + inpNation.value + " was updated to " + inpRel.value + " and negotations about " + inpTreaty.value + 
                " were completed, with an exchange of " + relAddInc.innerText.replace("Income:",""));
                await this.update();
            }
            else {
                this.errorsnd.play();
            };
        });

        container.appendChild(document.createElement("p"));
    };

    //Create menu for adding new relations
    async createRelationsAdd() {
        let container = document.getElementById("settings");
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id = "AddingRelations"
        Add.className = "grid5";
        head.innerHTML = "Add new nations for diplomatic relations";
        container.appendChild(head);

        let inpNation = document.createElement("input");
        inpNation.placeholder = "Add name of party"
        inpNation.type = "text";
        inpNation.required = true;
        inpNation.id = "inpNation";
        Add.appendChild(inpNation);

        let inpRel = document.createElement("input");
        inpRel.placeholder = "current relation";
        inpRel.required = true;
        inpRel.id = "inpRel";
        inpRel.title = "Between -100 and +100 for war and alliance respectively."
        Add.appendChild(inpRel);

        let inpTreaty = document.createElement("input");
        inpTreaty.placeholder = "existing treaties";
        inpTreaty.required = true;
        inpTreaty.id = "inpTreaty";
        Add.appendChild(inpTreaty);

        
        
        let inc = document.createElement("div");
        await this.createIncomeSub(Add,"incomeSub","treaty",inc);
        inc.id = "relAddInc";
        inc.className = "addInc";
        inc.innerText = "Income: ---";
        Add.appendChild(inc);

        inc.addEventListener("click", () => {
            showDrags(document.getElementById("incomeSub"));
        });

        let btn = document.createElement("button");
        btn.innerHTML="▶";
        btn.id = "btnRel";
        Add.appendChild(btn);

        container.appendChild(Add);
        
        dragElement(document.getElementById("incomeSub"));
    };

    //Create submenu for adding weekly incomes
    async createIncomeSub (container,id,header,incdiv) {
        let incobj = {};
        let dragdiv = document.createElement("div"),
            dragdivheader = document.createElement("div"),
            dragdivcontent = document.createElement("div"),
            classname = "dragdiv";
        dragdiv.className = classname+" hidden";
        dragdiv.id = id;
        dragdivheader.className = classname+"header";
        dragdivheader.id = id+"header";
        dragdivheader.innerText = "Income of " + header;
        dragdivcontent.className = classname+"content";
        dragdivcontent.id = id+"content";
        
        let inclist = document.createElement("div"),
            inclisttext = "Income per week:";
        inclist.className = "assetlist";
        inclist.innerText = inclisttext + "\n---";
        dragdivcontent.appendChild(inclist);
        

        let slct = document.createElement("select");
        slct.id = "incItemName";
        
        this.createOption(slct,0,"---");
        (await this.db.goods.toArray()).forEach(async item => {
            this.createOption(slct,item.name,item.name);
        });
        dragdivcontent.appendChild(slct);
        let itemnum = await this.createInput(dragdivcontent,"Weekly income","incItemNumber","Add the number of items, which are included in this trade agreement.",true);
        let btn = document.createElement("button");
        btn.innerText = "Add";
        dragdivcontent.appendChild(btn);
        btn.addEventListener("click", () => {
            if (+itemnum.value != 0){
                incobj[slct.value] = +itemnum.value;
                this.updateIncomelist(inclist,inclisttext,incobj);
            }
            else {
                this.errorsnd.play();
            };
            slct.value = 0;
            itemnum.value = "";
        });

        let btnSave = document.createElement("button"),
            btnSavetitle = "No assets were added to the list.",
            btnSaveClasses_def = "nonbuildable assetlist_rights",
            btnSaveClasses_add = btnSaveClasses_def.replace("nonbuildable","buildable");
        btnSave.classList = btnSaveClasses_def;
        btnSave.textContent = "Save treaty conditions.";
        btnSave.title = btnSavetitle;

        inclist.addEventListener("DOMNodeInserted" || "DOMNodeRemoved", e => {
            if (inclist.getElementsByTagName("li").length > 0) {
                btnSave.classList = btnSaveClasses_add;
                btnSave.title = "Transfer incomes and close window.";
            }
            else {
                btnSave.classList = btnSaveClasses_def;
                btnSave.title = btnSavetitle;
            };
        });
        
        btnSave.addEventListener("click", () => {
            if (btnSave.className.search(/\bbuildable\b/) >= 0) {
                console.log(incobj);
                showDrags(document.getElementById(id));
                let inccont = "Income:\n";
                Object.keys(incobj).forEach( asset => {
                    inccont += "• " + asset + ": " + incobj[asset] + "\n"; 
                });
                incdiv.innerText = inccont;
                incdiv.value = incobj;
                incobj = {};
                this.updateIncomelist(inclist,inclisttext,incobj);
            }
            else {
                this.errorsnd.play();
            };
        });

        dragdiv.appendChild(dragdivheader);
        dragdiv.appendChild(dragdivcontent);
        dragdiv.appendChild(btnSave);
        container.appendChild(dragdiv);
    };

    //Updates incomelist
    updateIncomelist (container,text,incobj) {
        container.textContent = text;
        Object.keys(incobj).forEach( asset => {
            let lip = document.createElement("li"),
                btn = document.createElement("button"),
                cellheight = "22px";
            lip.innerText = asset + ": " + incobj[asset];
            lip.style.height = cellheight;
            btn.textContent = "Remove";
            btn.value = asset;
            btn.className = "assetlist_rights";
            btn.style.height = cellheight;
            lip.appendChild(btn);
            container.appendChild(lip);

            btn.addEventListener("click", () => {
                delete incobj[asset];
                this.updateIncomelist(container,text,incobj);
            });
        });
        

    };

    //Create menu for adding items in settings screen
    async createItemsAdd() {
        let container = document.getElementById("settings");
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id = "AddingGoods";
        Add.className = "grid4";
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
        op.id ="opt_itemadd";
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
        return inp;
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
        Add.className = "grid4";
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

        this.createInput(Add,"Weekly Income - Number","inpWeeklyYieldNumber","",false);

        let inc = document.createElement("div");
        await this.createIncomeSub(Add,"BuildincomeSub","building",inc);
        inc.id = "buildAddInc";
        inc.className = "addInc";
        inc.innerText = "Income: ---";
        Add.appendChild(inc);

        inc.addEventListener("click", () => {
            showDrags(document.getElementById("BuildincomeSub"));
        });

        let op = document.createElement("select");
        this.createOption(op,true,"Number variable");
        this.createOption(op,false,"Number fixed to 1");
        
        op.id ="optionsVary";
        Add.appendChild(op)

        let btn = document.createElement("button");
        btn.innerHTML="▶"
        btn.id = "btnBuild";
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
        while (days > 8){
            days -= Object.values(months)[j]
            j += 1
        };
        if (days - 7 < 0) {
            j -= 1
            days += Object.values(months)[j]
        };
        time.month = Object.keys(months)[j]
        time.date = days-7
        
        await this.db.time.put(time)
        if (time.week == 1) {
            return 41;
        }
        else {
            return time.week -1;
        };        
    };

    //Adds the necessary calculations to the weekPassed function
    weekPassedComputations() {
        return this.db.transaction("rw",this.db.population,this.db.diplomacy,this.db.goods,this.db.capacity, async ()=>{
            let goods = await this.getAllGoods();
            let diplDB = await this.db.diplomacy.get("Diplomacy"), popsDB = await this.db.population.get("Population"),
                capDB = await this.db.capacity.get("Capacity");

            Object.keys(goods).every(res =>{
                if (goods[res].unstorable ) {
                    goods[res].total = 0;
                }
                //Manage food first
                else if (goods[res].food ) {
                    if (goods[res].income > capDB.food - capDB.actfood ) {
                        console.log(capDB.food - capDB.actfood)
                        goods[res].total += - capDB.actfood + capDB.food ;
                        return false;
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
                        console.log(res,":",capDB.resources - capDB.actres)
                        goods[res].total += - capDB.actres + capDB.resources ;
                        return false;
                    }
                    else if (goods[res].total < goods[res].income && goods[res].income < 0){
                        goods[res].total = 0;
                    }
                    else {
                        goods[res].total += goods[res].income;
                    };
                };
                return true;
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
        let week = await this.timeManager();
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
        let protocol_message = "Week "+week+" passed.";
        this.protocol_list.push(protocol_message);
    };

    //Creates default page and computes current value of several assets and in total
    async createStatTot() {
        let time_aux = await this.db.time.get("Time"),
            basics_aux = await this.db.basics.get("Basics");
        
        //Create Favicon out of village emblem
        let iconlink = document.createElement("link");
        iconlink.type = "image/x-icon";
        iconlink.rel = "shortcut icon";
        iconlink.href = basics_aux.avatar;
        document.getElementsByTagName("head")[0].appendChild(iconlink);

        //Update Name in gamebox header
        let logo = document.getElementById("logoGamebox"),
            logosuff = " - Economic Aspects";
        if (basics_aux.villagename.length > 8) {
            logosuff = " - Economy";
            if (basics_aux.villagename.length > 17) {
                logosuff = "";
            };
        };
        logo.textContent = basics_aux.villagename + logosuff;
        //Create Stattable
        let container = document.getElementById("stat-tot");
        container.innerHTML="";
        let cell1 = document.createElement("div"),
                head = document.createElement("h1");
        head.style = "white-space: pre"
        head.innerHTML = basics_aux.villagename + "\n\n"+time_aux.month+" Day "+time_aux.date
        head.align = "center";
        let img = document.createElement("img");
        img.src = basics_aux.avatar;
        img.style.height = '200px'; img.style.width = '200px';
        cell1.appendChild(img);
        cell1.style.textAlign = "center";
        cell1.style.height = "240px";
        container.appendChild(head);
        container.appendChild(cell1);
        
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
        prod.innerHTML = "&#9881; "+cap_aux.prodmod+" %";
    };

    async createRelationsTable() {
        let container = document.getElementById("relations");
        container.innerHTML = "";

        this.createCells(container, ["Realm", "Relationship", "Established treaties", "Yield of treaties", "Problems"]);
        this.createLine(container,5);
        
        let relations = await this.db.relations.toArray();
        relations.forEach(rel => {
            this.createCells(container,[rel.name]);
            //Create relationship selects
            let slct = document.createElement("select");
            for (let i = -100;i<=100;i++) {
                let opt = document.createElement("option");
                opt.value = i;
                opt.innerText = i;
                if(i === rel.relval) {opt.selected = "selected"};
                slct.style = "text-align: center";
                slct.appendChild(opt);
                if (i === 0) {
                    let opt = document.createElement("option");
                    opt.value = "?";
                    opt.innerText = "?";
                    if(Number.isNaN(+rel.relval)) {opt.selected = "selected"};
                    slct.style = "text-align: center";
                    slct.className = "mainselect";
                    slct.appendChild(opt);
                };
            };
            slct.addEventListener("change", async (e)=> {
                const prev_number = rel.relval;
                rel.relval = +slct.value;
                await this.db.relations.put(rel);
                this.protocol_list.push("The relationship with "+rel.name+" was changed from "+prev_number+" to "+rel.relval+".")
                await this.update();
            });
            container.appendChild(slct);
            
            //Create Treaty-related stuff
            this.createCells(container,[rel.treaty]);
            let txt_yield = "",
            cell5 = document.createElement("div");
            //Create strings in subfunctions
            txt_yield += this.iterateYields(rel.income);
            cell5.style = "white-space: pre;";
            cell5.innerHTML = txt_yield
            container.appendChild(cell5)
            this.createCells(container,[rel.problems])
        });
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
                cell.addEventListener("mouseover", async (el) => {
                el.target.value="";
                let titlestr = "Problems in supply chain with\n",
                    otherprobs = [],
                    chainprob = false;
                problems.forEach(prob => {
                    if (prob.search("treaty") != -1) {
                        otherprobs.push(prob);
                    }
                    else {
                    titlestr += "- "+prob + "\n";
                    chainprob = true;
                    };
                });
                if (chainprob) {
                    el.target.title=titlestr;
                };
               
                otherprobs.forEach(othprob => {
                    el.target.title += othprob+"\n";
                });
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
                    slct.className = "mainselect"
                    slct.appendChild(opt);
                };
                slct.addEventListener("change", async (e)=> {
                    const prev_number = aux.number;
                    aux.number = slct.value*1;
                    await this.db.buildings.put(aux);
                    this.protocol_list.push("The number of assets in "+aux.name+" was changed from "+prev_number+" to "+aux.number+".")
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

    //Save the databases as file
    async saveDB() {
        let basics_aux = await this.db.basics.get("Basics");
        await this.gatherDB();
        let file = new Blob( [JSON.stringify(this.DB,null,4)],{type: "application/json"});
        const a= document.createElement("a");
        console.log(this.DB,"json",JSON.stringify(this.DB,null,4))
        a.href = URL.createObjectURL(file);
        a.download = basics_aux.villagename + "_databases_"+ (new Date()).toDateString().replaceAll(" ", "_")+".json";
        a.click();

        URL.revokeObjectURL(a.href);
    };

    //Loads databases via uploaded file
    async loadDB(file) {
        await this.db.delete().then(() => {
            this.declareDatabase("village_database");
        });
        this.tablenames = [];
        this.db.tables.forEach(table => {
            this.tablenames.push(table.name);
        });
        return this.db.transaction("rw",this.tablenames, async() => {
            const data = JSON.parse(file);
            await Promise.all(Object.entries(data).map(([key, val]) => {
                return this.db[key].bulkPut(val);
            }));
        }).then(async ()=> await this.update());
        
    };

    //Gathers information from database and puts it into an object
    async gatherDB() {
        let test = {
            goods:      await this.db.goods.toArray(),
            buildings:  await this.db.buildings.toArray(),
            time:       await this.db.time.toArray(),
            population: await this.db.population.toArray(),
            capacity:   await this.db.capacity.toArray(),
            diplomacy:  await this.db.diplomacy.toArray(),
            value:      await this.db.value.toArray(),
            webhook:    await this.db.webhook.toArray(),
            adresses:   await this.db.adresses.toArray(),
            relations:   await this.db.relations.toArray()
        };
        return this.db.transaction("rw",this.tablenames, async () => {
            this.DB = {};
            this.db.tables.forEach(async table => {
                this.DB[table.name] = await table.toArray();
            });
        }).then( async () => {
            console.log("gathered");
        });
    };

    //Sends databases to Discord
    async sendDB() {
        let time = await this.db.time.get("Time"),
            cntc = await this.db.adresses.get("Lady Ereldra Naerth"),
            basics_aux = await this.db.basics.get("Basics");
            
        let namestr = basics_aux.villagename + "_databases_"+ (new Date()).toDateString().replaceAll(" ", "_")+".json";
        let comment = prompt('You are sending the current state of ' + basics_aux.villagename + ' to the Discord server.\nAdd comments, if necessary:');
        if (comment === null){
            return
        };

        let checkbox_prot = document.getElementById("protocol_checkbox");
        const xhr = new XMLHttpRequest();
        const params = {
            username: cntc.name,
            avatar_url: cntc.avatar,
            content: "Report on status of " + basics_aux.villagename + " in week " + time.week + " of year " + time.year + " p.F.",
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
        if (comment){
            params.embeds = [{
                "title": "Comments:",
                "color": 16776960,
                "description": comment
            }]
        };
        if (checkbox_prot.checked) {
            let protocol = document.getElementById("protocol_list"),
                entries = Array.from(protocol.getElementsByClassName("prot_entry")),
                disc_comm = "";
            entries.forEach(bullet => {
                disc_comm += bullet.textContent+"\n";
            });
            if (disc_comm === "") {
                disc_comm = "*None*"
            };
            params.embeds.push({
                "title": "Protocol of passed actions",
                "color": parseInt("7AD0E6",16),
                "description": disc_comm
            });
        };
        
        let hook = await this.checkWebhook();
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
        body += 'files[0]"; filename='+ namestr +"\r\nContent-Type: text/plain"+ '\r\n\r\n';
        await this.gatherDB();
        body += JSON.stringify(this.DB,null,4);
        body += '\r\n'
        body += '--' + boundary + '--';
        xhr.onload = function() {
        }
        xhr.send(body);
    };

    //Create the protocol in a draggable box
    createProtocol () {
        for (let entry of this.protocol_list){
            let list_entry = document.createElement("li");
            list_entry.className = "prot_entry"
            list_entry.innerText = entry;
            document.getElementById("protocol_list").appendChild(list_entry);
        };
        this.protocol_list = [];
    };

    //Subfunction to shorten createStatBuild function
    iterateYields(obj,str) {
        if (Object.keys(obj) != 0) {
            let txt ="";
            for (let x in obj) {
                txt += x+": "+obj[x] +" ";
            };
            if (str != undefined) {
                return str+"\n"+txt+"\n"
            }
            else {
                return txt+"\n"
            };
            
        }
        else {
            return ""
        };
    };

    //Computes the yield per week writes them into the goods database including computation of food consumption and (de-)buffs on production modifier
    computeWeeklyYield() {
        return this.db.transaction("rw",this.db.population,this.db.goods,this.db.buildings,this.db.capacity,this.db.diplomacy,this.db.relations, async()=>{
            let incomes = {},
                number = {};
            (await this.getAllBuildings()).forEach(building => {incomes[building.name] = building.yield_weekly; number[building.name]=building.number});
            let goods = await this.getAllGoods();
            let cap_aux = await this.db.capacity.get("Capacity");
            const pops = await this.db.population.get("Population");
            //One week has 8 days on Caeldaria
            let cons = 8*(pops.adult+0.5*pops.infant);
            let goods_aux = {...goods};
            Object.keys(goods_aux).forEach(resource => {goods_aux[resource].income = 0; goods_aux[resource].deficit = [];});
            Object.keys(incomes).forEach(building => {Object.keys(incomes[building]).forEach((resource,i) => {
                goods_aux[resource].income += Object.values(incomes[building])[i]*number[building];
                if (goods_aux[resource].total < 0 ) {
                    goods_aux[resource].total = 0;
                };
            })});
            // Check for consumption of goods by buildings
            let incs = {};
            //Creates object with negative incomes
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
            Object.values(goods_aux).forEach(good => {
                if (good.total + good.income < 0) {
                    //Gather overall consumption of the particular good
                    let overallcons = 0;
                    if (incs[good.name] === undefined) {
                        console.log("Undef",good.name,incs)
                    }
                    
                    incs[good.name].forEach(building => {
                        overallcons += incomes[building][good.name]*number[building];
                    });
                    incs[good.name].forEach(building => {
                        Object.keys(incomes[building]).forEach(res => {
                            if (res != good.name) {
                                let inc_diff = incomes[building][res] * number[building] * (good.total + good.income)/overallcons;
                                if (inc_diff >= incomes[building][res]*number[building]) {
                                    inc_diff = incomes[building][res]*number[building];
                                }
                                goods_aux[res].income -= inc_diff;
                                (goods_aux[res].deficit).push(good.name)
                            }
                        })
                    });
                    
                }
            });
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

            //Adding income/exchange from treaties
            let inc_rel = {};
            (await this.db.relations.toArray()).forEach(rel => {
                inc_rel = {};
                Object.keys(rel.income).every(async key => {
                    if (goods[key].income+goods[key].total+rel.income[key] < 0) {
                        inc_rel = {};
                        rel.problems = "Unfulfilled treaty requirements due to missing " + key;
                        await this.db.relations.put(rel);
                        Object.keys(rel.income).forEach(res => {
                            (goods[res].deficit).push("Unfulfilled treaty requirements with " + rel.name + " due to missing " + key);
                        });
                        return false;
                    };
                    if (inc_rel[key] === undefined) {
                        inc_rel[key] = rel.income[key];
                    }
                    else {
                        inc_rel[key]+=rel.income[key];
                    };
                    return true;
                });
                Object.keys(inc_rel).forEach(res => {
                    goods[res].income += inc_rel[res];
                });
            });

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
            this.protocol_list.push("A " + building.name + " was built.")
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
    async addGood (Name,addTot,valPU,foodmod,luxmod){
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
                await this.db.goods.put({name: Name, income: 0, total: addTot,valPU:valPU,unstorable:false,food:foodbol,consmod:foodmod,luxmod:luxmod});
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

    //Messenger 
    async fillContacts(){
        let aux = await this.db.adresses.toArray(),
            adresses = {};
        aux.forEach((adres)=> {adresses[adres.name] = adres});
        let adress_sct = document.getElementById("senders"),
            contacts = document.getElementById("contactlist");
        contacts.innerHTML ="";
        adress_sct.innerHTML="";
        let styledef = "height: 40px";
        Object.keys(adresses).forEach(adr => {
            //For Messenger
            let opt = document.createElement("option");
            opt.innerText = adr;
            adress_sct.appendChild(opt);

            //For Contacts
            let li = document.createElement("li"),
                img = document.createElement("img");
            li.innerText = adr;
            li.className = "contactlistpoint";
            img.className = "assetlist_rights";
            li.style = styledef;
            img.style = styledef;
            if (adresses[adr].avatar === "") {
                img.src = "";
                li.appendChild(img);
            }
            else {
                let a   = document.createElement("a");
                img.src = adresses[adr].avatar;
                a.href = img.src;
                a.target="_blank";
                a.appendChild(img);
                li.appendChild(a);
            };
            contacts.appendChild(li);
        });
    };
    async addContact(){
        let contname = document.getElementById("contact_name"),
            contava = document.getElementById("contact_ava");
        await this.db.adresses.put({name:contname.value,avatar:contava.value});
        this.protocol_list.push("Added the contact of " + contname.value + ".");
        contname.value="";
        contava.value="";
        this.update();
    };

    async sendMsgviaDiscord(sender_sel, msg_inp) {
        const xhr = new XMLHttpRequest(),
            adress = await this.db.adresses.get(sender_sel.value),
            basics_aux = await this.db.basics.get("Basics");
        const params = {
            username: adress.name,
            avatar_url: adress.avatar,
            embeds: [{
                "title": "A letter for the regents of " + basics_aux.villagename,
                "color": parseInt("FFFBE6",16),
                "description": msg_inp.value
            }]
        };
        
        let hook = await this.checkWebhook();
        xhr.open("POST", hook.hook,true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify(params));
        msg_inp.value="";
    };

    async checkWebhook() {
        let hook = await this.db.webhook.get("Webhook");
        if (hook.hook === "---") {
            let newhook = prompt("There is no webhook adress in the database, probably you want to give one:");
            if (newhook === null || newhook === "") {
                this.errorsnd.play();
            }
            else {
                hook.hook = newhook;
            };
        };
        await this.db.webhook.put(hook);
        return hook
    }

    async sendMsgviaEmail(sender_sel,msg_inp) {
        const adress = await this.db.adresses.get(sender_sel.value),
            basics_aux = await this.db.basics.get("Basics");
        let a = document.createElement("a");
        a.href='mailto:?body=' + msg_inp.value + '&subject=A letter for the regents of '+ basics_aux.villagename +' from ' + adress.name;
        a.click();
        msg_inp.value = "";
    };

    checkReceivers(radios) {
        let rec = "";
        for (let i of radios) {
            if (i.checked) {
                rec = i.value
            };
        };
        return rec
    };

};