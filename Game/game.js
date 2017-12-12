class MapManager {
    constructor(){
        this.mapData = null;  //переменая для хранения карты
        this.tLayer = null;   //переменная для хранения ссылки на блоки карты
        this.xCount = 250;  //количество блоков по горизонтали
        this.yCount = 20;  //количество блоков по вертикали
        this.tSize = {    //размер блока
            x: 32,
            y: 32
        };
        this.mapSize = {  //размер карты в пикселях
            x: 640,
            y: 8000
        };
        this.tilesets = [];    //массив описаний блоков карты
        this.imgLoadCount = 0; // количество загруженных изображений
        this.imgLoaded = false; // изображения не загружены
        this.jsonLoaded = false; // json не загружен
        this.view = {
            x: 0,
            y: 7380,
            w: 800,
            h: 637
        }
    }

    loadMap(path) {
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                mapManager.parseMap(request.responseText);
            }
        };
        request.open("GET", path, true);
        request.send();
    }

    parseMap (tilesJSON) {
        this.mapData = JSON.parse(tilesJSON); //разобрать JSON
        //this.mapData = tilesJSON;
        this.xCount = this.mapData.width; // соэранение ширины
        this.yCount = this.mapData.height; // сохранение высоты
        this.tSize.x = this.mapData.tilewidth; // сохранение размера блока
        this.tSize.y = this.mapData.tileheight; // сохранение размера блока
        this.mapSize.x = this.xCount * this.tSize.x; // вычисление размера карты
        this.mapSize.y = this.yCount * this.tSize.y;
        for (let i = 0; i < this.mapData.tilesets.length; i++) {
            const img = new Image(); // создаем переменную для хранения изображений
            img.onload = function () { // при загрузке изображения
                mapManager.imgLoadCount++;
                if (mapManager.imgLoadCount === mapManager.mapData.tilesets.length) {
                    mapManager.imgLoaded = true; // загружены все изображения
                }
            };
            img.src = this.mapData.tilesets[i].image; // задание пути к изображению
            let t = this.mapData.tilesets[i]; //забираем tileset из карты
            const ts = { // создаем свой объект tileset
                firstgid: t.firstgid, // с него начинается нумерация в data
                image: img,
                name: t.name, // имя элемента рисунка
                xCount: Math.floor(t.imagewidth / mapManager.tSize.x), // горизонталь
                yCount: Math.floor(t.imageheight / mapManager.tSize.y) // вертикаль
            }; // конец объявления ts
            this.tilesets.push(ts); // сохраняем tileset в массив
        } // окончание цикла for
        this.jsonLoaded = true; // когда разобран весь json
    }

    draw(ctx) { // отрисовка карты в контексте
        // если карта не загружена, то повторить прорисовку через 100 мс
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.draw(ctx);
            }, 80);
        } else {
            if (this.tLayer === null) {// проверка, что tLayer настроен
                for (let id = 0; id < this.mapData.layers.length; id++) {
                    // проходим по всем layer карты
                    let layer = this.mapData.layers[id];
                    if (layer.type === "tilelayer") {
                        this.tLayer = layer;
                        break;
                    }
                }
            }
            for (let i = 0; i < this.tLayer.data.length; i++) { // проходим по всей карте  !!!
                if (this.tLayer.data[i] !== 0) { // если данных нет, то пропускаем
                    let tile = this.getTile(this.tLayer.data[i]); // получение блока по индексу
                    let pX = (i % this.xCount) * this.tSize.x; // вычисляем x в пикселях
                    let pY = Math.floor(i / this.xCount) * this.tSize.y;
                    // не рисуем за пределами видимой зоны
                    if (!this.isVisible(pX, pY, this.tSize.x, this.tSize.y))
                        continue;
                    // сдвигаем видимую зону
                    pX -= this.view.x;
                    pY -= this.view.y;
                    ctx.drawImage(tile.img, tile.px, tile.py, this.tSize.x, this.tSize.y, pX, pY, this.tSize.x, this.tSize.y); //
                    //отрисовка в контексте
                }
            }
        }
    }

    getTile(tileIndex) { // индекс блока
        let tile = {
            img: null, // изображение tileset
            px: 0, py: 0 // координаты блока в tileset
        };
        let tileset = this.getTileset(tileIndex);
        tile.img = tileset.image; // изображение искомого tileset
        let id = tileIndex - tileset.firstgid; // индекс блока в tileset
        // блок прямоугольный, остаток от деления на xCount дает х в tileset
        let x = id % tileset.xCount;
        let y = Math.floor(id / tileset.xCount);
        tile.px = x * mapManager.tSize.x;
        tile.py = y * mapManager.tSize.y;
        return tile; // возвращаем тайл для отображения
    }

    getTileset(tileIndex) { // получение блока по индексу
        for (let i = mapManager.tilesets.length - 1; i >= 0; i--) {
            // в каждом tilesets[i].firstgid записано число, с которого начинается нумерация блоков
            if (mapManager.tilesets[i].firstgid <= tileIndex) {
                // если индекс первого блока меньше , либо равен искомому, значит этот tileset и нужен
                return mapManager.tilesets[i];
            }
        }
        return null;
    }
    // не рисуем за пределами видимой зоны
    isVisible(x, y, width, height) {
        if (x + width < this.view.x || y + height < this.view.y || x > this.view.x + this.view.w || y > this.view.y + this.view.h)
            return false;
        return true;
    }

    parseEntities() { //разбор слоя objectgroup
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.parseEntities();
            }, 80);
        } else {
            for (let i = 0; i < this.mapData.layers.length; i++){  //просмотр всех слоев
                if (this.mapData.layers[i].type === 'objectgroup'){  //првоерка для нахождения слоя объектов
                    let entities = this.mapData.layers[i];  //вспомогательная переменная дла сокращенной записи
                    for (let j = 0; j < entities.objects.length; ++j){    //просмотр всех объектов
                        let e = entities.objects[j];
                        try{
                            let obj = Object.create(gameManager.factory[e.type]);
                            obj.name = e.name;
                            obj.pos_x = e.x;
                            obj.pos_y = e.y;
                            obj.size_x = e.width;
                            obj.size_y = e.height;
                            gameManager.entities.push(obj); //помещение в массив объектов
                            if (obj.name === "player"){
                                gameManager.initPlayer(obj);
                            }
                        } catch (ex){
                            console.log("Error while creating: [" + e.gid + "]" + e.type + ", " + ex);
                        }
                    }   //конец for для бъекто
                }   //конец if проверки
            }
        }
    }

    getTilesetIdx(x, y) {
        // получить блок по координатам на карте
        const wX = x;
        const wY = y;
        const idx = Math.floor(wY / this.tSize.y) * this.xCount + Math.floor(wX / this.tSize.x);
        return this.tLayer.data[idx];
    }

    centerAt(x, y) {
        this.view.y = y - 32;
    }
}

class SpriteManager{
    constructor(){
        this.image = new Image(); //рисунок с объектами
        this.sprites = [];    //массив объектов
        this.imgLoaded = false;   //рисунки загружены
        this.jsonLoaded = false;  //JSON загружен
    }
    loadAtlas(atlasJson, atlasImg) {
        const request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                spriteManager.parseAtlas(request.responseText);
            }
        };
        request.open("GET", atlasJson, true);
        request.send();
        this.loadImg(atlasImg);
    }

    loadImg(imgName) { // загрузка изображения
        this.image.onload = function () {
            spriteManager.imgLoaded = true;
        };
        this.image.src = imgName;
    }

    parseAtlas(atlasJSON) { // разбор атласа с обеъектами
        const atlas = JSON.parse(atlasJSON);
        for (let name in atlas.frames) { // проход по всем именам в frames
            let frame = atlas.frames[name].frame; // получение спрайта и сохранение в frame
            this.sprites.push({name: name, x: frame.x, y: frame.y, w: frame.w, h: frame.h}); // сохранение характеристик frame в виде объекта
        }
        this.jsonLoaded = true; // атлас разобран
    }

    drawSprite(ctx, name, x, y) {
        // если изображение не загружено, то повторить запрос через 80 мс
        if (!this.imgLoaded || !this.jsonLoaded) {
            setTimeout(function () {
                spriteManager.drawSprite(ctx, name, x, y);
            }, 80);
        } else {
            let sprite = this.getSprite(name); // получить спрайт по имени
            if (!mapManager.isVisible(x, y, sprite.w, sprite.h))
                return; // не рисуем за пределами видимой зоны
            x -= mapManager.view.x;
            y -= mapManager.view.y;
            // отображаем спрайт на холсте
            ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
            // }

        }
    }

    getSprite(name) { // получить спрайт по имени
        for (let i = 0; i < this.sprites.length; i++) {
            const s = this.sprites[i];
            if (s.name === name)
                return s;
        }
        return null; // не нашли спрайт
    }
}

class EventsManager {
    constructor(){
        this.bind = []; // сопоставление клавиш действиям
        this.action = []; // действия
    }
    setup() { // настройка сопоставления
        this.bind[65] = 'left'; // a - двигаться влево
        this.bind[68] = 'right'; // b - двигаться вправо
        this.bind[32] = 'space'; // пробел - выстрел
        document.body.addEventListener("keydown", this.onKeyDown);
        document.body.addEventListener("keyup", this.onKeyUp);
    }

    onKeyDown(event) {
        const action = eventsManager.bind[event.keyCode];
        if (action) {// проверка на action === true
            eventsManager.action[action] = true; // выполняем действие
        }
    }

    onKeyUp(event) {
        const action = eventsManager.bind[event.keyCode];
        if (action)
            eventsManager.action[action] = false; // отменили действие
    }
}

class PhysicsManager {
    update(obj) {
        if (obj.move_x === 0 && obj.move_y === 0)
            return "stop"; // скорости движения нулевые
        let newX = obj.pos_x + Math.floor(obj.move_x * obj.speed);
        let newY = obj.pos_y + Math.floor(obj.move_y * obj.speed);

        let e = this.entityAtXY(obj, newX, newY); // объект на пути
        if (e !== null && obj.onTouchEntity) // если есть конфликт
            obj.onTouchEntity(e); // разбор конфликта внутри объекта
        //Если есть препятствие

        if (e === null) { // перемещаем объект на свободное место
            obj.pos_x = newX;
            obj.pos_y = newY;
        } else
            return "break"; // дальше двигаться нельзя

        if (obj.name.match(/enemy[\d]/)){
            if (obj.move_flag){
                obj.move_flag = false;
                setTimeout(() => {
                    obj.move_y = obj.move_y === 1 ? -1 : 1;
                    obj.move_flag = true;
                }, 2000);
            }
            this.fire(obj, newX, newY);
        }
    }

    entityAtXY(obj, x, y) { // поиск объекта по координатам

        for (let i = 0; i < gameManager.entities.length; i++) {
            let e = gameManager.entities[i]; // рассматриваем все объекты на карте
            if (e.name !== obj.name) { // имя не совпадает
                if (x + obj.size_x < e.pos_x || // не пересекаются
                    y + obj.size_y < e.pos_y ||
                    x > e.pos_x + e.size_x ||
                    y > e.pos_y + e.size_y)
                    continue;
                return e; // найден объект
            }
        }
        return null; // объект не найден
    }

    fire(obj, x, y){
        let _player = gameManager.player;
        let player_x, player_y;
        player_x = _player.pos_x + _player.size_x / 2;
        player_y = _player.pos_y;
        let x_length = Math.abs(obj.pos_x - player_x);
        let y_length = player_y - obj.pos_y;
        obj.radius = Math.sqrt(x_length * x_length + y_length * y_length);

        if (obj.radius > game_session.enemy_radius[game_session.level]){
            return;
        }
        else{
            if (obj.fire_flag){
                obj.fire();
                obj.fire_flag = false;
                setTimeout(() => {
                    obj.fire_flag = true;
                }, game_session.enemy_shot_period[game_session.level]);
            }
        }
    }
}

class GameManager {
    constructor(){
        this.factory = {}; // фабрика объектов на карте
        this.entities = []; // объекты на карте
        this.shotNum = 0;
        this.player = null; // указатель на объект игрока
        this.score  = 0;
        this.count_shots = 0;
        this.laterKill = [];
    }
    initPlayer(obj) { // инициализация игрока
        this.player = obj;
    }

    kill(obj) {
        this.laterKill.push(obj);
    }

    update() { // обновление информации
        if (this.player === null)
            return;
        this.player.move_x = 0;
        this.player.move_y = -1;

        if (eventsManager.action["left"]) {
            this.player.move_x = -1.5;
        }
        if (eventsManager.action["right"]) {
            this.player.move_x = 1.5;
        }
        if (eventsManager.action["space"]){
            this.player.fire();
            eventsManager.action["space"] = false;
        }
        //обновление информации по всем объектам на карте
        this.entities.forEach(function (e) {
            try {
                e.update();
            } catch(ex) {}
        });
        for(let i = 0; i < this.laterKill.length; i++) {
            const idx = this.entities.indexOf(this.laterKill[i]);
            if(idx > -1)
                this.entities.splice(idx, 1); // удаление из массива 1 объекта
        }
        if (this.laterKill.length > 0) // очистка массива laterKill
            this.laterKill.length = 0;
        if (document.getElementById("record").innerHTML.split(": ")[1] !== gameManager.score){
            document.getElementById("record").innerHTML = document.getElementById("record").innerHTML.split(": ")[0] + ": " + gameManager.score;
        }

        mapManager.draw(ctx);
        mapManager.centerAt(this.player.pos_x,this.player.pos_y -524);
        this.draw(ctx);
    }

    draw(ctx) {
        for (let e = 0; e < this.entities.length; e++) {
            this.entities[e].draw(ctx);
        }
    }

    loadAll() {
        /*let clips = ["sound/fon_lvl1.mp3", "sound/fon_lvl2.mp3", "sound/laser.wav", "sound/laser_enemy.wav", "sound/death.wav", "sound/death.mp3", "sound/win.mp3"];
        soundManager.init();
        soundManager.loadArray(clips);*/
        soundManager.play(game_session.fon_sound[game_session.level], {looping: true, volume: 1});
        mapManager.loadMap(game_session.map[game_session.level]); // загрузка карты
        spriteManager.loadAtlas("sprites.json", "pictures/spritesheet.png"); // загрузка атласа
        gameManager.factory['player'] = new Player(); // инициализация фабрики
        gameManager.factory['finish'] = new Finish();
        gameManager.factory['death'] = new Death();
        gameManager.factory['enemy1'] = new Enemy();
        gameManager.factory['enemy2'] = new Enemy();
        gameManager.factory['enemy3'] = new Enemy();
        gameManager.factory['bonus'] = new Bonus();
        gameManager.factory['enemy1'].draw = function (ctx) {  //функция отрисовки
            spriteManager.drawSprite(ctx, "enemy1", this.pos_x, this.pos_y);
        };
        gameManager.factory['enemy2'].draw = function (ctx) {  //функция отрисовки
            spriteManager.drawSprite(ctx, "enemy2", this.pos_x, this.pos_y);
        };
        gameManager.factory['enemy3'].draw = function (ctx) {  //функция отрисовки
            spriteManager.drawSprite(ctx, "enemy3", this.pos_x, this.pos_y);
        };
        mapManager.parseEntities(); // разбор сущностей карты
        mapManager.draw(ctx); // отобразить карту
        eventsManager.setup(); // настройка событий
    }

    stop() {
        for (let i = 0; i !== this.entities.length; i++){
            this.entities[i].kill(this.entities[i]);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mapManager = null;
        spriteManager = null;
        physicsManager = null;
        eventsManager = null;
        gameManager = null;
    }
}

class SoundManager {
    constructor(){
        this.clips = {};
        this.context = null;
        this.gainNode = null;
        this.loaded = false;
    }
    init() {
        this.context = new AudioContext();
        this.gainNode = this.context.createGain();
        this.gainNode.connect(this.context.destination);
    }

    load(path, callback) {
        if (this.clips[path]) {
            callback(this.clips[path]);
            return;
        }
        let clip = {
            path: path,
            buffer: null,
            loaded: false,
            play: function(volume, loop) {
                soundManager.play(this.path, {
                    looping: loop ? loop : false,
                    volume: volume ? volume : 1
                });
            }
        };
        this.clips[path] = clip;
        const request = new XMLHttpRequest();
        request.open("GET", path, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            soundManager.context.decodeAudioData(request.response,
                function (buffer) {
                    clip.buffer = buffer;
                    clip.loaded = true;
                    callback(clip);
                });
        };
        request.send();
    }

    loadArray(array) {
        for(let i = 0; i < array.length; i++){
            soundManager.load(array[i], function () {
                if (array.length === Object.keys(soundManager.clips).length){
                    for (let sd in soundManager.clips){
                        if (!soundManager.clips[sd].loaded) return;
                        soundManager.loaded = true;
                    }
                }
            });
        }
    }

    play(path, settings) {
        if (!soundManager.loaded){
            setTimeout(function () {
                soundManager.play(path, settings);
            }, 1000);
            return;
        }

        let looping = false;
        let volume = 1;
        if (settings){
            if (settings.looping){
                looping = settings.looping;
            }
            if (settings.volume){
                volume = settings.volume;
            }
        }
        let sd = this.clips[path];
        if (sd === null) return false;

        let sound = soundManager.context.createBufferSource();
        sound.buffer = sd.buffer;
        sound.connect(soundManager.gainNode);
        sound.loop = looping;
        soundManager.gainNode.gain.value = volume;
        sound.start(0);
        return true;
    }

    stopAll() {
        this.gainNode.disconnect();
        this.gainNode = this.context.createGain();
        this.gainNode.connect(this.context.destination);
    }
}

class Entity {
    constructor(){
        this.pos_x = 0;
        this.pos_y = 0; //позиция объекта

        this.size_x = 0;
        this.size_y = 0;   //размер объекта
    }
}

class Player extends Entity {
    constructor() {
        super();
        this.lifetime = 100;
        this.move_x = 0;    this.move_y = 0;    //направления движения
        this.speed = 3; //скорость движения
        this.name = "player";
        this.pos_y = 524;
        this.draw = function(ctx){  //функция отрисовки
            spriteManager.drawSprite(ctx, this.name, this.pos_x, this.pos_y);
        };
        this.update = function(){   //обновление объекта
            physicsManager.update(this);
        };
        this.onTouchEntity = function(obj){ //действие при соприкосновении с объектом
            if (obj.name.match(/death[\d]/) || obj.name.match(/enemy[\d]/) || obj.name.match(/shot[/d]/)){
                this.kill();
            }
            if (obj.name.match(/bonus[\d]/)){
                gameManager.score++;
                obj.kill();
            }
            if (obj.name === "finish"){
                this.kill("finish");
            }
        };
        this.kill = function(param){ //убийство игрока
            gameManager.kill(this);
            hide(param);
        };
        this.fire = function(){ //стреьба
            let shot = new PlayerShot();
            shot.pos_x = this.pos_x + this.size_x / 2 - 8;
            shot.pos_y = this.pos_y - 33;
            gameManager.entities.push(shot);
        };
    }
}

class Enemy extends Entity {
    constructor() {
        super();
        this.lifetime = 100;
        this.move_x = 1;
        this.move_y = 1;
        this.speed = game_session.enemy_speed[game_session.level]; //скорость движения
        this.move_flag = true;
        this.fire_flag = true;
        this.radius = 0;

        this.update = function () {   //обновление объекта
            physicsManager.update(this);
        };
        this.onTouchEntity = function (obj) { //действие при соприкосновении с объектом
            if (obj.name.match(/death[\d]/)){
                this.move_x = this.move_x === 1 ? this.move_x = -1 : this.move_x = 1;
                this.move_y = this.move_y === 1 ? this.move_y = -1 : this.move_y = 1;
            }
            if (obj.name.match(/bonus[\d]/)) {
                this.move_x = this.move_x === 1 ? this.move_x = -1 : this.move_x = 1;
                this.move_y = this.move_y === 1 ? this.move_y = -1 : this.move_y = 1;
            }
            if (obj.name.match(/enemy[\d]/)) {
                this.move_x = this.move_x === 1 ? this.move_x = -1 : this.move_x = 1;
                this.move_y = this.move_y === 1 ? this.move_y = -1 : this.move_y = 1;
            }
            if (obj.name.match(/shot[\d]/)){
                if (obj.move_y < 0){
                    obj.kill();
                    this.kill();
                }
            }
            if (obj.name === "player"){
                obj.kill();
            }
        };
        this.kill = function () { //убийство игрока
            gameManager.kill(this);
        };
        this.fire = function () { //стреьба
            let shot = new EnemyShot();
            shot.setLengths(this.pos_x + this.size_x / 2, this.pos_y);
            shot.pos_x = this.pos_x;
            shot.pos_y = this.pos_y + 34;
            gameManager.entities.push(shot);
        };
    }
}

class EnemyShot extends Entity {
    constructor() {
        super();
        this.size_x = 16;
        this.size_y = 16;
        this.move_x = 0;
        this.move_y = 1;
        this.speed = game_session.enemy_shot_speed[game_session.level]; //скорость движения
        this.name = "shot" + ++gameManager.count_shots;
        this.type = "shot";
        this.count = 1;
        this.color_flag = true;

        this.setFlag = function () {
            this.color_flag = this.color_flag !== this.color_flag;
        };

        this.setLengths = function (enemy_x, enemy_y) {
            let _player = gameManager.player;
            let player_x, player_y;
            if (_player !== null) {
                player_x = _player.pos_x + _player.size_x / 2 + 16;
                player_y = _player.pos_y;
            }
            let x_length = Math.abs(enemy_x - player_x);
            let y_length = player_y - enemy_y;
            let radius = Math.sqrt(x_length * x_length + y_length * y_length);
            x_length /= radius;
            y_length /= radius;
            this.move_x = (enemy_x - player_x) > 0 ? -x_length : x_length;
            this.move_y = y_length;
        };

        this.draw = function (ctx) {  //функция отрисовки
            if (this.color_flag){
                spriteManager.drawSprite(ctx, "shot1", this.pos_x, this.pos_y);
                setTimeout(this.setFlag, 500);
                if (++this.count > 10){
                    this.count = 1;
                    this.color_flag = false;
                }
            }
            else{
                spriteManager.drawSprite(ctx, "shot2", this.pos_x, this.pos_y);
                setTimeout(this.setFlag, 500);
                if (++this.count > 10){
                    this.count = 1;
                    this.color_flag = true;
                }
            }

        };
        this.update = function () {   //обновление объекта
            physicsManager.update(this);
        };
        this.onTouchEntity = function (obj) { //действие при соприкосновении с объектом
            if (obj.name.match(/death[\d]/)){
                this.kill();
            }
            if (obj.name.match(/bonus[\d]/) || (obj.name.match(/shot[\d]/))){
                obj.kill();
                this.kill();
            }
            if (obj.name === "player"){
                obj.kill();
                this.kill();
            }

        };
        this.kill = function () { //убийство игрока
            gameManager.kill(this);
        };
        soundManager.play("sound/laser_enemy.wav");
    }
}

class PlayerShot extends Entity {
    constructor() {
        super();
        this.size_x = 16;
        this.size_y = 16;
        this.move_x = 0;
        this.move_y = -1;
        this.speed = 6; //скорость движения
        this.name = "shot" + ++gameManager.count_shots;
        this.type = "shot";
        this.count = 1;
        this.color_flag = false;
        this.draw = function (ctx) {  //функция отрисовки
            if (this.color_flag){
                spriteManager.drawSprite(ctx, "shot1", this.pos_x, this.pos_y);
                setTimeout(this.setFlag, 500);
                if (++this.count > 10){
                    this.count = 1;
                    this.color_flag = false;
                }
            }
            else{
                spriteManager.drawSprite(ctx, "shot2", this.pos_x, this.pos_y);
                setTimeout(this.setFlag, 500);
                if (++this.count > 10){
                    this.count = 1;
                    this.color_flag = true;
                }
            }
        };
        this.update = function () {   //обновление объекта
            physicsManager.update(this);
        };
        this.onTouchEntity = function (obj) { //действие при соприкосновении с объектом
            if (obj.name.match(/death[\d]/) || (obj.name === "finish")){
                this.kill();
            }
            if (obj.name.match(/bonus[\d]/) || (obj.name.match(/shot[\d]/)) || (obj.name.match(/enemy[\d]/)) || (obj.name === "player") ){
                obj.kill();
                this.kill();
            }
            if (obj.name.match(/enemy[\d]/)){
                gameManager.score++;
                obj.kill();
                this.kill();
            }
        };
        this.kill = function () { //убийство игрока
            gameManager.kill(this);
        };
        soundManager.play("sound/laser.wav");
    }
}

class Bonus extends Entity {
    constructor(){
        super();
        this.count = 1;
        this.draw = function(ctx) { //прорисовка объекта
            if ( this.count >= 8){
                this.count = 1;
            }
            spriteManager.drawSprite(ctx, "bonus" + (++this.count), this.pos_x, this.pos_y);
        };
        this.kill = function() {    //уничтожение объекта
            gameManager.kill(this);
        };
    }
}

class Death extends Entity {
    constructor(){
        super();
        this.draw = function(ctx) { //прорисовка объекта

        };
        this.kill = function() {    //уничтожение объекта
        };
    }
}

class Finish extends Entity {
    constructor(){
        super();
        this.draw = function(ctx) { //прорисовка объекта

        };
        this.kill = function() {    //уничтожение объекта
        };
    }
}

var mapManager;
var spriteManager;
var eventsManager;
var physicsManager;
var gameManager;
var interval;
var soundManager = new SoundManager();
soundManager.init();
soundManager.loadArray(["sound/fon_lvl1.mp3",
    "sound/fon_lvl2.mp3",
    "sound/laser.wav",
    "sound/laser_enemy.wav",
    "sound/death.mp3",
    "sound/win.mp3"]);
var game_session = {
    player_name: undefined,
    enemy_shot_speed: [4, 6],
    enemy_shot_period: [3000, 1500],
    enemy_speed: [1, 1.5],
    enemy_radius: [300, 400],
    map: ["MyLvl1.json", "MyLvl2.json"],
    fon_sound: ["sound/fon_lvl1.mp3", "sound/fon_lvl2.mp3"],
    level: 0
};

function updateWorld() {
    ctx.clearRect(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
    gameManager.update();
}

function setName(name) {
    game_session.player_name = name;
}

function play(saveScore) {
    mapManager = new MapManager();
    spriteManager = new SpriteManager();
    eventsManager = new EventsManager();
    physicsManager = new PhysicsManager();
    gameManager = new GameManager();
    gameManager.loadAll();
    gameManager.score = (saveScore === undefined ? 0 : saveScore);
    interval = setInterval(updateWorld, 17);

}

function hide(param) {
    clearInterval(interval);
    soundManager.stopAll();
    if (param === "finish"){
        soundManager.play("sound/win.mp3");
        if (game_session.level === 0){
            setTimeout(function () {
                game_session.level = 1;
                document.getElementById("level2").style.background = "darkblue";
                document.getElementById('level1').style.background = 'deepskyblue';
                let tmp = gameManager.score;
                gameManager.stop();
                play(tmp);
            }, 10000);
        }
    }
    else{
        soundManager.play("sound/death.mp3");
    }
    if (!((param === "finish") && (game_session.level === 0))){
        setTimeout(function(){
            ctx.clearRect(0, 0, document.getElementById("canvas").width, document.getElementById("canvas").height);
            document.getElementById("canvas").style.background = "white";
            document.getElementById("canvas").style.display = 'none';
            document.getElementById('end_page').style.marginRight = '45%';
            if ((param !== undefined) && (param === "finish")){
                document.getElementById("record").innerHTML = "МОЕ ПОЗДРАВЛЕНИЕ<br>" + "Вы набрали: " + gameManager.score + " очков<br>";
            }
            else{
                document.getElementById("record").innerHTML = "ПОТРАЧЕНО<br>" + "Вы набрали: " + gameManager.score + " очков<br>";
            }
            document.getElementById("ok").style.display = 'block';
        }, 500);
        setCookie(game_session.player_name, gameManager.score);
    }
}

function startPage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameManager.stop();
    document.getElementById("canvas").style.display = 'none';
    document.getElementById("canvas").style.background = 'url("pictures/background.png")';
    document.getElementById("record").style.display = 'none';
    document.getElementById("ok").style.display = 'none';
    document.getElementById("end_page").style.marginRight = '7%';
    document.getElementById("record").innerHTML = "Количество очков: 0";
    document.getElementById("menu").style.display = '';
}

function setCookie(name, value) {
    let new_cookie = name + "=" + value;
    let cookies = getCookie("record");
    cookies = (cookies === undefined ? [] :
        cookies.indexOf("!") === -1 ?  [cookies] : cookies.split("!"));
    for(let i in cookies){
        if (cookies[i].split("=")[0] === new_cookie.split("=")[0])
            cookies.splice(i, 1);
    }
    cookies.push(new_cookie);
    console.log(cookies);
    cookies = cookies.join();
    cookies = cookies.replace(/,/g, "!");
    document.cookie = "record=" + cookies;
}

function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function showRecords() {
    let cookies = getCookie("record") === undefined ? [] : getCookie("record").split("!");
    cookies.sort(function (a, b) {
        return +b.split("=")[1] - +a.split("=")[1];
    });
    document.getElementById("menu").style.display = 'none';
    let records = "<h2 style='margin-left: 90px'>Таблица рекордов</h2><br><br>";
    for (var cookie of cookies){
        records += "<h3>"+ cookie.split("=")[0] + "    -    " + cookie.split("=")[1] + "</h3><br>"
    }
    document.getElementById("records").innerHTML = records + "<button onclick=\"document.getElementById('records').style.display = 'none'; document.getElementById('menu').style.display = ''\">\n" +
        "            Назад\n" +
        "        </button>";
    document.getElementById("records").style.display = "block";
}
