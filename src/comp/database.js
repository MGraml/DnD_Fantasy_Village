export class Database {
    constructor() {
          this.db = new Dexie("assignan_database");
          this.db.version(1).stores({
              goods: 'name,income,total,valPU',
              buildings: 'name,cost,number,yield_weekly,yield_const,value,buildable',
              time: 'name,year,week',
              population: 'name,total,adult,infant,housings',
              capacity: 'name,resources,food',
              diplomacy: 'name,fame,arcane',
              value: 'name,total,resources,buildings'
          });


        let btn_save = document.querySelector("button#save"),
            inp_load = document.querySelector("input#load");

            btn_save.addEventListener("click", () =>{
                this.saveDB();
            });
            inp_load.addEventListener("change", (e) => {
                let reader = new FileReader();
                reader.addEventListener("load", (ev) => this.loadDB(ev.target.result));
                reader.readAsText(e.target.files[0]);
            });

        //this.initDatabase();
        this.initSettings();
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                this.update();
            }
        })
        //this.update();
    };

    async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };


    //Initializes the Database with certain values - will be replaced by external .json
    async initDatabase() {
        this.assets = ["Wood","Stone","Silver","Marble","Glass","Gold","Grapes","Pottery","Furniture","Bread","Wheat","Beef","Fish","Spiritual Food","GP"];
        this.asset_num = [5475,25,12,220,625,5,40,60,0,1250,0,700,300,0,2658];
        this.asset_VPU = [1.5,3,50,10,4,100,2.5,2,6.5,0.1,0.1,0.3,0.2,0,1];
        
        
        for (let i=0;i<this.assets.length;i++) {
            this.db.goods.put({name:this.assets[i],income:0,total:this.asset_num[i],valPU:this.asset_VPU[i]});
        }
        let goods = await this.getAllGoods();

        this.infstr = ["House","Storehouse","Fishing Hut","Farm","Gristmill","Carpentry","Fiddler's Green","Silver Mine - unskilled Workers","Silver Mine - skilled Workers","Fishing Village - Paris","Chapel - Lancellin","Inn"];
        this.infstr_cost = [{"Wood":150,"Stone":100,"GP":475},{"Wood":450,"Stone":300,"GP":925},{"Wood":50,"Stone":20,"GP":140},
            {"Wood":500,"Stone":200,"GP":1900},{"Wood":100,"Stone":75,"GP":300},{"Wood":150,"Stone":100,"GP":550},
            {"Wood":125,"Stone":75,"GP":800},{},{},{},{"GP": 600},{"GP": 800}];
        this.infstr_num  = [19,1,3,4,2,0,1,15,4,1,1,1];
        this.yield_weekly= [{},{},{"Fish": 48},{"Beef": 80, "Wheat": 100},{"Wheat": -200, "Bread": 200, "GP": 2},{"Wood": -4,"Furniture":4},{},{"Silver": 0.064},{"Silver": 0.4},{"Fish": 100},{"Spiritual Food":240},{}];
        this.yield_const = [{"Housings":8},{"StorRes": 15000, "StorFood": 30000},{},{"Housings":4},{},{},{},{},{},{},{},{}];
        this.buildable = [true,true,true,true,true,true,true,false,false,false,false,false];
        
        for (let j=0; j<this.infstr.length;j++) {
            let valueBuilding = 0;
            Object.keys(this.infstr_cost[j]).forEach(resource =>{
                valueBuilding += this.infstr_cost[j][resource]*goods[resource].valPU
            })

            this.db.buildings.put({name: this.infstr[j],cost:this.infstr_cost[j], 
                                    number: this.infstr_num[j],yield_weekly:this.yield_weekly[j],yield_const:this.yield_const[j],
                                    value: valueBuilding,buildable:this.buildable[j]})
        }
        await this.db.time.put({name:"Time",year: 1132, week:30});
        await this.db.population.put({name:"Population",total:167,adult:144,infant:23,housings:0});
        await this.db.capacity.put({name:"Capacity",resources:0,food:0});
        
        await this.db.diplomacy.put({name:"Diplomacy",fame: 2,arcane:1});
        await this.db.value.put({name:"Value",total: 0,resources:0,buildings:0});
    }

    //Is called when important things happen and an update is necessary
    async update(){
        this.getAllGoods().then((goods)=>{
            if (Object.keys(goods).length > 0) {
                let loadtxt = document.querySelector("#loadfirst");
                loadtxt.className ="hidden";
            }});
        await this.createStatGoods();
        await this.createStatBuild();
        await this.computeWeeklyYield();
        await this.computeConstantYield();
        await this.createStatGoods();
        await this.createStatTot();
        await this.initSettings();
    };

    //Initializing Settings page
    async initSettings() {
        await this.createItemsAdd();
        let add = document.getElementById("AddingGoods"),
            inputs = Array.from(add.querySelectorAll("input")),
            btn = add.querySelector("button"),
            ops = document.getElementById("opt");
        let abort = false;
        await btn.addEventListener("click", async () => {
            let inpValTot = inputs[1].value;
            if(inputs[0].value.length === 0 || inputs[1].value.length === 0){
                abort = true;
            }
            if (abort === false){
                if (ops.selectedOptions[0].text==="Remove") {
                     inpValTot *= -1;
                }
                await this.addGood(inputs[0].value,0,inpValTot*1,inputs[2].value*1)
            }
        });
        await this.createBuildingsAdd();
    };
    async createBuildingsAdd () {
        let container = document.getElementById("settings");
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id ="AddingBuilds";
        head.innerHTML = "Add new buildings";
        container.appendChild(head);
        let inpName = document.createElement("input");
        let datalist = document.createElement("datalist");
        let builds = await this.getAllBuildings();
        console.log(builds);
        builds.forEach( building => {
            let opt = document.createElement("option");
            opt.value = building.name;
            datalist.appendChild(opt);
        })
        datalist.id = "buildlist"
        inpName.setAttribute('list', "buildlist");
        inpName.placeholder="Add name"
        inpName.type = "text"
        inpName.required = true
        inpName.id="inpName"
        Add.appendChild(datalist);
        Add.appendChild(inpName);


        let optTotalYield = document.createElement("select"),
            optionempty = document.createElement("option"),
            optionHous = document.createElement("option"),
            optionStorRes = document.createElement("option"),
            optionStorFood = document.createElement("option");
        optionempty.value = 0;
        optionempty.innerText = "---"
        optionempty.selected ="selected";
        optionHous.innerText = "Housings";
        optionStorRes.innerText = "Storage Resources";
        optionStorFood.innerText = "Storage Food";
        optTotalYield.appendChild(optionempty);
        optTotalYield.appendChild(optionHous);
        optTotalYield.appendChild(optionStorRes);
        optTotalYield.appendChild(optionStorFood);
        Add.appendChild(optTotalYield)

        let inpTotalYieldNumber = document.createElement("input");
        inpTotalYieldNumber.placeholder="Constant Yield - Number"
        inpTotalYieldNumber.type = "number"
        inpTotalYieldNumber.id="inpTotalYieldNumber"
        Add.appendChild(inpTotalYieldNumber);


        let optWeeklyYield = document.createElement("select"),
        optionemptyWeekly = document.createElement("option");
        optionemptyWeekly.value = 0;
        optionemptyWeekly.innerText = "---";
        optionemptyWeekly.selected ="selected";
        let goods = await this.getAllGoods();
        Object.keys(goods).forEach(name => {
            let optGood = document.createElement("option");
            optGood.innerText = name;
            optGood.value = 1;
            optWeeklyYield.appendChild(optGood);
        });
        optWeeklyYield.appendChild(optionemptyWeekly);
        Add.appendChild(optWeeklyYield)


        let inpWeeklyYieldNumber = document.createElement("input");
        inpWeeklyYieldNumber.placeholder="Weekly Income - Number"
        inpWeeklyYieldNumber.type = "number"
        inpWeeklyYieldNumber.id="inpWeeklyYieldNumber"
        Add.appendChild(inpWeeklyYieldNumber);

        let op = document.createElement("select"),
            option1 = document.createElement("option"),
            option2 = document.createElement("option");
        option1.value = true;
        option1.innerText = "Buildable";
        op.appendChild(option1);
        option2.value = false;
        option2.innerText = "Not buildable";
        option2.selected = "selected";
        op.appendChild(option2);
        op.id ="optionsBuild";
        Add.appendChild(op)

        let btn = document.createElement("button");
        btn.innerHTML="▶"
        Add.appendChild(btn)

        container.appendChild(Add);
    };
    //Create necessary HTML in settings page
    async createItemsAdd() {
        let container = document.getElementById("settings");
        container.innerHTML="";
        let head = document.createElement("h1"), Add = document.createElement("div");
        Add.id = "AddingGoods"
        head.innerHTML = "Add new items";
        container.appendChild(head);

        let inpName = document.createElement("input");
        let datalist = document.createElement("datalist");
        let goods = await this.getAllGoods();
        Object.keys(goods).forEach( name => {
            let opt = document.createElement("option");
            opt.value = name;
            datalist.appendChild(opt);
        })
        datalist.id = "goodlist"
        inpName.setAttribute('list', "goodlist");
        inpName.placeholder="Add new item's name"
        inpName.type = "text"
        inpName.required = true
        inpName.id="inpName"
        Add.appendChild(datalist);
        Add.appendChild(inpName);

        let op = document.createElement("select"),
            option1 = document.createElement("option"),
            option2 = document.createElement("option");
        option1.value = 0;
        option1.innerText = "Add";
        op.appendChild(option1);
        option2.value = 1;
        option2.innerText = "Remove";
        op.appendChild(option2);
        op.id ="opt";
        Add.appendChild(op)

        let inpTotal = document.createElement("input");
        inpTotal.placeholder="Stored units"
        inpTotal.type = "number"
        inpTotal.id="inpTotal"
        Add.appendChild(inpTotal);

        let inpVal = document.createElement("input");
        inpVal.placeholder="Value p.U."
        inpVal.type = "number"
        inpVal.id="inpVal"
        Add.appendChild(inpVal);

        let btn = document.createElement("button");
        btn.innerHTML="▶"
        Add.appendChild(btn)
        container.appendChild(Add)
    };
    
    //Takes care of correct year/month
    async timeManager() {
        let time = await this.db.time.get("Time");
        if (time.week === 41) {time.year +=1; time.week = 1} else {time.week += 1}
        await this.db.time.put(time)
    };

    //Adds the necessary calculations to the weekPassed function
    weekPassedComputations() {
        return this.db.transaction("rw",this.db.population,this.db.diplomacy,this.db.goods, async ()=>{
            let goods = await this.getAllGoods();
            let diplDB = await this.db.diplomacy.get("Diplomacy"), popsDB = await this.db.population.get("Population");
            
            Object.keys(goods).forEach(res =>{
                goods[res].total += goods[res].income
            });
            await this.db.goods.bulkPut(Object.values(goods));
            popsDB.adult += 0.75*diplDB.fame;
            popsDB.infant+= 0.25*diplDB.fame;
            popsDB.total = popsDB.adult + popsDB.infant;
            await this.db.population.put(popsDB);
        })
    }

    //Gathers information from subfunctions and executes them
    async weekPassed() {
        this.timeManager();
        this.weekPassedComputations();
        this.update();
    };

    //Creates default page and computes current value of several assets and in total
    async createStatTot() {
        let container = document.getElementById("stat-tot");
        container.innerHTML="";
        let cell1 = document.createElement("div"),
                head = document.createElement("h1");
        head.innerHTML = "Assignan"
        let img = document.createElement("img");
        img.src = "./src/images/Wappen_Assignan.png"
        img.style.height = '96px'; img.style.width = '96px';
        img.align="right"
        cell1.appendChild(img)
        container.appendChild(head)
        container.appendChild(cell1)
        
        let time = document.createElement("div"), 
                pop = document.createElement("div"), 
                cap = document.createElement("div"),
                dipl = document.createElement("div"),
                val = document.createElement("div");

        let pop_aux  = await this.db.population.get("Population"),
            time_aux = await this.db.time.get("Time"),
            cap_aux  = await this.db.capacity.get("Capacity"),
            dipl_aux = await this.db.diplomacy.get("Diplomacy"),
            val_aux  = await this.db.value.get("Value");

        val_aux.total = val_aux.buildings + val_aux.resources
        await this.db.value.put(val_aux);

        let pop_txt =""; for (let x in pop_aux) {pop_txt += x+": "+pop_aux[x] +" "}; pop.innerHTML = pop_txt.replace("name:",""); container.appendChild(pop);
        let time_txt =""; for (let x in time_aux) {time_txt += x+": "+time_aux[x] +" "}; time.innerHTML = time_txt.replace("name:",""); container.appendChild(time);
        let cap_txt =""; for (let x in cap_aux) {cap_txt += x+": "+cap_aux[x] +" "}; cap.innerHTML = cap_txt.replace("name:",""); container.appendChild(cap);
        let dipl_txt =""; for (let x in dipl_aux) {dipl_txt += x+": "+dipl_aux[x] +" "}; dipl.innerHTML = dipl_txt.replace("name:",""); container.appendChild(dipl);
        let val_txt =""; for (let x in val_aux) {val_txt += x+": "+val_aux[x] +" "}; val.innerHTML = val_txt.replace("name:",""); container.appendChild(val);

        
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

    loadDB(file) {
        const data = JSON.parse(file);
        this.db.transaction("rw",this.db.goods,this.db.buildings,this.db.time,this.db.population, this.db.capacity, this.db.diplomacy, this.db.value, async() => {
            await Promise.all(Object.entries(data).map(([key, val]) => {
                return this.db[key].bulkPut(val);
            }));
        }).then(()=> this.update());
        
    };
    //Creates Statistic page for goods and computes total value of goods for default page
    async createStatGoods() {
        let container = document.getElementById("stat-goods");
        container.innerHTML="";
        let cell1 = document.createElement("div"), 
                cell2 = document.createElement("div"), 
                cell3 = document.createElement("div"),
                cell4 = document.createElement("div"),
                cell5 = document.createElement("div");
        cell1.className = "cell" 
        cell1.innerHTML = "Goods"
        cell2.className = "cell" 
        cell2.innerHTML = "Total Number"
        cell5.innerHTML = "Income per Week"
        cell5.className = "cell"
        cell3.className = "cell" 
        cell3.innerHTML = "Value per Unit in GP"
        cell4.className = "cell" 
        cell4.innerHTML = "Total value of this asset"



        container.appendChild(cell1)
        container.appendChild(cell2)
        container.appendChild(cell5)
        container.appendChild(cell3)
        container.appendChild(cell4)
        for (let i=1;i<=5;i++){
            container.appendChild(document.createElement("hr"))
        };
        let valueGoods = 0;
        let goods = await this.getAllGoods();

        for (let good of Object.values(goods)) {
            let cell1 = document.createElement("div"), 
            cell2 = document.createElement("div"), 
            cell3 = document.createElement("div"),
            cell4 = document.createElement("div"),
            cell5 = document.createElement("div");
            valueGoods+=good.total*good.valPU
            cell1.className = "cell" 
            cell1.innerHTML = good.name
            cell2.className = "cell" 
            cell2.innerHTML = good.total.toFixed(2)
            cell3.className = "cell" 
            cell3.innerHTML = good.valPU
            cell4.className = "cell" 
            cell4.innerHTML = (good.total*good.valPU).toFixed(2)
            cell5.className = "cell"
            cell5.innerHTML = good.income

            container.appendChild(cell1)
            container.appendChild(cell2)
            container.appendChild(cell5)
            container.appendChild(cell3)
            container.appendChild(cell4)

            }
        let aux_val = await this.db.value.get("Value");
        aux_val.resources = valueGoods;
        await this.db.value.put(aux_val)
    };

    //Creates the statisticspage for buildings and computes their total value
    async createStatBuild() {
        let container = document.getElementById("build");
        container.innerHTML="";
        let cell1 = document.createElement("div"), 
            cell2 = document.createElement("div"), 
            cell3 = document.createElement("div"),
            cell4 = document.createElement("div"),
            cell5 = document.createElement("div");
        cell1.className = "cell" 
        cell1.innerHTML = "Building"
        cell2.className = "cell" 
        cell2.innerHTML = "Cost"
        cell3.className = "cell" 
        cell3.innerHTML = "Number"
        cell4.className = "cell"
        cell4.innerHTML = "Build"
        cell5.className = "cell"
        cell5.innerHTML = "Yield"

        container.appendChild(cell1)
        container.appendChild(cell2)
        container.appendChild(cell3)
        container.appendChild(cell5)
        container.appendChild(cell4)
        
        
        for (let i=1;i<=5;i++){
            container.appendChild(document.createElement("hr"))
        };
        let valueBuildings = 0;
        let builds = await this.getAllBuildings();
        for (let build of builds ) {
            let cell1 = document.createElement("div"), 
                cell2 = document.createElement("div"), 
                cell3 = document.createElement("div"),
                cell5 = document.createElement("div"),
                btn = document.createElement("button");
            let aux = build
            valueBuildings += aux.value*aux.number
            cell1.className = "cell" 
            cell1.innerHTML = aux.name
            cell2.className = "cell" 
            let txt_cost ="";
            for (let x in aux.cost) {
                txt_cost += x+": "+aux.cost[x] +" ";
            };
            cell2.innerHTML = txt_cost
            cell3.className = "cell" 
            cell3.innerHTML = aux.number
            cell5.className = "cell"
            let txt_yield = "";
            if (Object.keys(aux.yield_weekly) != 0) {
                let txt_yield_weekly ="";
                for (let x in aux.yield_weekly) {
                    txt_yield_weekly += x+": "+aux.yield_weekly[x] +" ";
                };
                txt_yield += "Weekly: "+txt_yield_weekly
            };
            if (Object.keys(aux.yield_const) != 0) {
                let txt_yield_const ="";
                for (let x in aux.yield_const) {
                    txt_yield_const += x+": "+aux.yield_const[x] +" ";
                };
                txt_yield += "Const: "+txt_yield_const
            };
            
            cell5.innerHTML = txt_yield

            container.appendChild(cell1)
            container.appendChild(cell2)
            container.appendChild(cell3)
            container.appendChild(cell5)

            if (aux.buildable === true) {
                btn.innerHTML   = "Build"
                btn.id          = "btn-build-"+aux.name
                btn.className   = "build"
                btn.addEventListener("click", ()=>this.buildBuilding(aux.name,1))
                container.appendChild(btn)
            }
            else{
                let btncell = document.createElement("div");
                btncell.innerHTML="";
                container.appendChild(btncell);
            }

            

            }
        let aux_val = await this.db.value.get("Value");
        aux_val.buildings = valueBuildings;
        await this.db.value.put(aux_val)
    };

    //Computes the yield per week writes them into the goods database
    computeWeeklyYield() {
        return this.db.transaction("rw",this.db.population,this.db.goods,this.db.buildings, async()=>{
            let incomes = {},
                number = {};
            (await this.getAllBuildings()).forEach(building => {incomes[building.name] = building.yield_weekly, number[building.name]=building.number});
            let goods = await this.getAllGoods();

            const pops = await this.db.population.get("Population");
            let cons = 8*(pops.adult+0.5*pops.infant);
            let goods_aux = {...goods};
            
            Object.keys(goods_aux).forEach(resource => {goods_aux[resource].income = 0});
            Object.keys(incomes).forEach(building => {Object.keys(incomes[building]).forEach((resource,i) => {goods_aux[resource].income += Object.values(incomes[building])[i]*number[building];})});
            
            //Managing food consumption
            cons -= goods_aux["Spiritual Food"].income
            goods_aux["Fish"].income -= cons*0.25;
            goods_aux["Beef"].income -= cons*0.25;
            goods_aux["Bread"].income -= cons*0.5;
            
            goods = {...goods_aux} 
            await this.db.goods.bulkPut(Object.values(goods));
        }).catch(err => {
            console.error(err.stack);
        });
    };

    //Computes the constant yields and writes them into the stat overall databases
    computeConstantYield() {
        return this.db.transaction("rw",this.db.capacity,this.db.population,this.db.buildings, async()=>{
            let incomes = {},
                number = {},
                auxYield = {"food":0,"resources":0,"housings":0},
                aux_stor = await this.db.capacity.get("Capacity"),
                aux_pop = await this.db.population.get("Population");
            (await this.getAllBuildings()).forEach(building => {incomes[building.name] = building.yield_const, number[building.name]=building.number});
            Object.keys(incomes).forEach( building =>{
                if (incomes[building].Housings != undefined) {
                    auxYield.housings+=incomes[building].Housings*number[building]
                }
                if (incomes[building].StorFood != undefined) {
                    auxYield.food+=incomes[building].StorFood*number[building]
                }
                if (incomes[building].StorRes != undefined) {
                    auxYield.resources+=incomes[building].StorRes*number[building]
                }
            })
            aux_stor.food = auxYield.food;
            aux_stor.resources = auxYield.resources;
            aux_pop.housings = auxYield.housings;
            await this.db.capacity.put(aux_stor)
            await this.db.population.put(aux_pop)
        }).catch(err => {
            console.error(err.stack);
        });
    };
 
    //Builds a certain building "number" times and removes the necessary goods from the database
    async buildBuilding (name, number){
        this.db.transaction("rw",this.db.goods,this.db.buildings, async()=>{
            const building = await this.db.buildings.get(name),
                requiredGoods = Object.keys(building.cost),
                goods = {};
            (await this.db.goods.bulkGet(requiredGoods)).forEach((resource, i) => goods[requiredGoods[i]] = resource)
            const buildable = requiredGoods.every(resourceName => goods[resourceName].total >= building.cost[resourceName])
            if(!buildable) {
                return
            }
            requiredGoods.forEach(resourceName => goods[resourceName].total -= building.cost[resourceName])
            await this.db.goods.bulkPut(Object.values(goods))
            building.number += number
            await this.db.buildings.put(building)
        }).then( () => { 
            this.update();
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
    async addGood (Name,addInc,addTot,valPU){
        this.db.transaction("rw",this.db.goods, async () => {
            let aux = await this.db.goods.get(Name);
            if (aux ===undefined) {
                await this.db.goods.put({name: Name, income: addInc, total: addTot,valPU:valPU});
            }
            else{
                aux.total += addTot;
                await this.db.goods.put(aux);
            }
        }).then(this.update())
    };

    //Gives information about all goods - mainly for debugging purposes
    async getAllGoods () {
        let aux = await this.db.goods.toArray(),
            goods = {};
        aux.forEach((res)=> {goods[res.name] = res});
        return goods;
    };

    //Gives information about a specific good - mainly for debugging purposes
    async getGood (Name) {
        let aux = await this.db.goods.get(Name);
        return aux;
    };

    //Gives information about all buildings - mainly for debugging purposes
    async getAllBuildings () {
        return await this.db.buildings.toArray();
    };

    //Gives information about a specific building - mainly for debugging purposes
    async getBuilding (Name) {
        let aux = await this.db.buildings.get(Name);
        return aux;
        }
}