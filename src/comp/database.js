export class Database {
    constructor() {
          this.db = new Dexie("assignan_database");
          this.db.version(1).stores({
              goods: 'name,income,total,valPU',
              buildings: 'name,cost,number,yield_weekly,yield_const,value',
              time: 'name,year,week',
              population: 'name,total,adult,infant,housings',
              capacity: 'name,resources,food',
              diplomacy: 'name,fame,arcane',
              value: 'name,total,resources,buildings'
          });
        
        this.initDatabase();
        this.update();
        
    };

    async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    async initDatabase() {
        this.assets = ["Wood","Stone","Silver","Marble","Glass","Gold","Grapes","Pottery","Furniture","Bread","Wheat","Beef","Fish","spiritual food","GP"];
        this.asset_num = [5475,25,12,220,625,5,40,60,0,1250,0,700,300,0,2658];
        this.asset_VPU = [1.5,3,50,10,4,100,2.5,2,6.5,0.1,0.1,0.3,0.2,0,1];
        
        
        for (let i=0;i<this.assets.length;i++) {
            this.db.goods.put({name:this.assets[i],income:0,total:this.asset_num[i],valPU:this.asset_VPU[i]});
        }
        let goods ={};

        this.infstr = ["House","Storehouse","Fishing Hut","Farm","Gristmill","Carpentry","Fiddler's Green"];
        this.infstr_cost = [{"Wood":150,"Stone":100,"GP":475},{"Wood":450,"Stone":300,"GP":925},{"Wood":50,"Stone":20,"GP":140},
            {"Wood":500,"Stone":200,"GP":1900},{"Wood":100,"Stone":75,"GP":300},{"Wood":150,"Stone":100,"GP":550},
            {"Wood":125,"Stone":75,"GP":800}];
        this.infstr_num  = [19,1,3,4,2,0,1];
        this.yield_weekly= [{},{},{"Fish": 48},{"Beef": 80, "Wheat": 100},{"Wheat": -200, "Bread": 200, "GP": 2},{"Wood": -4,"Furniture":4},{}];
        this.yield_const = [{"Housings":8},{"StorRes": 15000, "StorFood": 30000},{},{"Housings":4},{},{},{},];
        (await this.db.goods.bulkGet(this.assets)).forEach((res,k)=> {goods[this.assets[k]] = res});
        
        for (let j=0; j<this.infstr.length;j++) {
            let valueBuilding = 0;
            Object.keys(this.infstr_cost[j]).forEach(resource =>{
                valueBuilding += this.infstr_cost[j][resource]*goods[resource].valPU
            })

            this.db.buildings.put({name: this.infstr[j],cost:this.infstr_cost[j], 
                                    number: this.infstr_num[j],yield_weekly:this.yield_weekly[j],yield_const:this.yield_const[j],
                                    value: valueBuilding})
        }
        await this.db.time.put({name:"Time",year: 1132, week:30});
        await this.db.population.put({name:"Population",total:167,adult:144,infant:23,housings:0});
        await this.db.capacity.put({name:"Capacity",resources:0,food:0});
        
        await this.db.diplomacy.put({name:"Diplomacy",fame: 2,arcane:1});
        await this.db.value.put({name:"Value",total: 0,resources:0,buildings:0});
    }

    async update(){
        await this.createStatGoods();
        await this.createStatBuild();
        await this.computeWeeklyYield();
        await this.computeConstantYield();
        await this.createStatGoods();
        await this.createStatTot();
    };

    //Creates default page and computes current value of several assets and in total
    async createStatTot() {
        let container = document.getElementById("stat-tot");
        container.innerHTML="";
        let cell1 = document.createElement("div"), 
                cell2 = document.createElement("div"), 
                cell3 = document.createElement("div"),
                cell4 = document.createElement("div"),
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

        //console.log(pop_aux,time_aux,cap_aux,dipl_aux,val_aux)
        let pop_txt =""; for (let x in pop_aux) {pop_txt += x+": "+pop_aux[x] +" "}; pop.innerHTML = pop_txt.replace("name:",""); container.appendChild(pop);
        let time_txt =""; for (let x in time_aux) {time_txt += x+": "+time_aux[x] +" "}; time.innerHTML = time_txt.replace("name:",""); container.appendChild(time);
        let cap_txt =""; for (let x in cap_aux) {cap_txt += x+": "+cap_aux[x] +" "}; cap.innerHTML = cap_txt.replace("name:",""); container.appendChild(cap);
        let dipl_txt =""; for (let x in dipl_aux) {dipl_txt += x+": "+dipl_aux[x] +" "}; dipl.innerHTML = dipl_txt.replace("name:",""); container.appendChild(dipl);
        let val_txt =""; for (let x in val_aux) {val_txt += x+": "+val_aux[x] +" "}; val.innerHTML = val_txt.replace("name:",""); container.appendChild(val);

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
        for (let i=0;i<this.assets.length;i++) {
            let cell1 = document.createElement("div"), 
                cell2 = document.createElement("div"), 
                cell3 = document.createElement("div"),
                cell4 = document.createElement("div"),
                cell5 = document.createElement("div");
            let aux = await this.db.goods.get(this.assets[i])
            valueGoods+=aux.total*aux.valPU
            cell1.className = "cell" 
            cell1.innerHTML = aux.name
            cell2.className = "cell" 
            cell2.innerHTML = aux.total
            cell3.className = "cell" 
            cell3.innerHTML = aux.valPU
            cell4.className = "cell" 
            cell4.innerHTML = aux.total*aux.valPU
            cell5.className = "cell"
            cell5.innerHTML = aux.income

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
        for (let i=0;i<this.infstr.length;i++) {
            let cell1 = document.createElement("div"), 
                cell2 = document.createElement("div"), 
                cell3 = document.createElement("div"),
                cell5 = document.createElement("div"),
                btn = document.createElement("button");
            let aux = await this.db.buildings.get(this.infstr[i])
            valueBuildings += aux.value*aux.number
            //console.log(aux,valueBuildings)
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


            btn.innerHTML   = "Build"
            btn.id          = "btn-build-"+aux.name
            btn.className   = "build"
            btn.addEventListener("click", ()=>this.buildBuilding(aux.name,1))
            

            container.appendChild(cell1)
            container.appendChild(cell2)
            container.appendChild(cell3)
            container.appendChild(cell5)
            container.appendChild(btn)

            }
        let aux_val = await this.db.value.get("Value");
        aux_val.buildings = valueBuildings;
        await this.db.value.put(aux_val)
    };

    //Computes the yield per week writes them into the goods database
    computeWeeklyYield() {
        return this.db.transaction("rw",this.db.population,this.db.goods,this.db.buildings, async()=>{
            let incomes = {},
                goods = {},
                number = {};
            (await this.db.buildings.bulkGet(this.infstr)).forEach((building, j) => {incomes[this.infstr[j]] = building.yield_weekly, number[this.infstr[j]]=building.number});
            (await this.db.goods.bulkGet(this.assets)).forEach((res,k)=> {goods[this.assets[k]] = res});
            
            const pops = await this.db.population.get("Population");
            let cons = 8*(pops.adult+0.5*pops.infant);
            let goods_aux = {...goods};
            
            Object.keys(goods_aux).forEach(resource => goods_aux[resource].income = 0);
            Object.keys(incomes).forEach(building => {Object.keys(incomes[building]).forEach((resource,i) => { goods_aux[resource].income += Object.values(incomes[building])[i]*number[building];})});
            
            //Managing food consumption
            cons -= goods_aux["spiritual food"].income
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
            (await this.db.buildings.bulkGet(this.infstr)).forEach((building, j) => {incomes[this.infstr[j]] = building.yield_const, number[this.infstr[j]]=building.number});
            //console.log(incomes,number);
            Object.keys(incomes).forEach( building =>{
                if (incomes[building].Housings != undefined) {
                    //console.log(building,incomes[building],number[building],incomes[building].Housings); 
                    auxYield.housings+=incomes[building].Housings*number[building]
                }
                if (incomes[building].StorFood != undefined) {
                    //console.log(building,incomes[building],number[building],incomes[building].StorFood);
                    auxYield.food+=incomes[building].StorFood*number[building]
                }
                if (incomes[building].StorRes != undefined) {
                    //console.log(building,incomes[building],number[building],incomes[building].StorRes); 
                    auxYield.resources+=incomes[building].StorRes*number[building]
                }
            })
            //console.log("After:",auxYield)
            aux_stor.food = auxYield.food;
            aux_stor.resources = auxYield.resources;
            aux_pop.housings = auxYield.housings;
            //console.log("Check",aux_stor,aux_pop)
            await this.db.capacity.put(aux_stor)
            await this.db.population.put(aux_pop)
        }).catch(err => {
            console.error(err.stack);
        });
    };
 
    async buildBuilding (name, number){
        this.db.transaction("rw",this.db.goods,this.db.buildings, async()=>{
            const building = await this.db.buildings.get(name),
                requiredGoods = Object.keys(building.cost),
                goods = {};
            (await this.db.goods.bulkGet(requiredGoods)).forEach((resource, i) => goods[requiredGoods[i]] = resource)
            //console.log(goods)
            const buildable = requiredGoods.every(resourceName => goods[resourceName].total >= building.cost[resourceName])
            if(!buildable) {
                return
            }
            requiredGoods.forEach(resourceName => goods[resourceName].total -= building.cost[resourceName])
            //console.log("Updated Goods:", Object.values(goods))
            await this.db.goods.bulkPut(Object.values(goods))
            building.number += number
            await this.db.buildings.put(building)
            //console.log("built " + number +" more of this", building)
        }).then( () => { 
            this.update();
        }).catch(err => {
            console.error(err.stack)
        })
        
    };

    async putGood (Name,newInc,newTot){
        await this.db.goods.put({name: Name, income: newInc, total: newTot});
        this.update();
    };

    async addGood (Name,addInc,addTot){
        this.db.transaction("rw",this.db.goods, async () => {
            let aux = await this.db.goods.get(Name);
            aux.total += addTot;
            aux.income+= addInc;
            await this.db.goods.put(aux);
        })
        this.update();
    };

    async getAllGoods () {
        let aux = await this.db.goods.bulkGet(this.assets);
        return aux;
    };

    async getGood (Name) {
        let aux = await this.db.goods.get(Name);
        return aux;
    };

    async getAllBuildings () {
        let aux = await this.db.buildings.bulkGet(this.infstr);
        return aux;
    };





    async getBuilding (Name) {
        let aux = await this.db.buildings.get(Name);
        console.log(aux);
        return aux;
        }
}