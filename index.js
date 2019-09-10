const Discord = require('discord.js');
const bot = new Discord.Client();
const Enmap = require("enmap");
const guildScrims = new Enmap({name: "scrims"});
const guildSettings = new Enmap({name: "settings"});
const token = 'NjE2NTA0MzM1MzcwODEzNDcw.XWdirw.-xudOMfXRqHNaSIhnwfuvBcssdo'; // bot token
const defaultSettings = {
    prefix: "!",
    timezone: "EST",
    playerRole: " ",
    schedulerRole: " ",
    botChannel: " ",
}

function createServer(guildid, object){
    guildScrims.ensure(guildid,object);
    guildSettings.ensure(guildid, defaultSettings)
}

bot.on("guildCreate", (guild) => {
    createServer(guild.id, []);
    guild.createRole({
        name: 'Scheduler',
        color: 'BLUE',
    })
        .then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
        .catch(console.error);
    guild.createRole({
        name: 'Player',
        color: 'RED'
    }).then(role => console.log(`Created new role with name ${role.name} and color ${role.color}`))
    .catch(console.error);
    })

bot.on("guildDelete", (guild) => {
    guildScrims.delete(guild.id);
    guildSettings.delete(guild.id);
    console.log("Removing " + guild.id + " from the database.");
})


// Ready message, sends to console on startup.
bot.on('ready', () => {
    console.log("Virtual McSlap is now online");
    bot.user.setActivity('use !info to see commands');
    //bot.channels.get(botsChannelID).send("The bot is now online.");
})



/* CHANGELOG
// 12:15 AM 5/25/19 - The bot is currently able to create and remove scrims, display them, load and save data into a json.
// 1:30 AM 5/26/19 - The bot is now running off of Amazon Web Service on a free version that gives me 30GB. Keep an eye on this so you don't get charged.
                     Basically it can run without my computer being on anymore. The import programs used here is PUTTY and WinSQP to access the server.
                     To  Add: don't allow for incorrect scrim formats to actually go through. Also if anyone messages the bot !schedule it can see the scrim schedule.
  6:42 PM 6/7/19 - WORKING GENERALLY, BUT CAN'T GET THE ALERT TO BE EFFICIENT.
  1:25 AM 6/8/19 - Added timezone support for American timezones. holy shit. Things display differently based on the time zone
  1:47 AM 6/8/19 - Need to get the bot to automatically check for upcoming scrims.
  3:02 AM 6/8/19 - Got it working. The bot searches for a channel named 'general' to send alert message in.
                I should make the bot's channel and role customizable, as well as maybe add permissions to use the bot specific to a role. ATM anyone can use any except checkNow.
    2:52 PM 6/8/19 - Maybe I should add a scrim posting board.
    7:24 PM 6/8/19 - Did a lot of error handling. Made customizable Player / Scheduler roles /Bot Channel.
    10:59 PM 6/11/19 - made an ad to help publicize it. Also made it so that player/scheduler role is by default created upon the bot entering the server. Can't figure out
                        how to get around the whole !initialize thing though
                */
// Dear future me returning to the bot.

// There are two enmaps, one for scrims, one for settings.  That is all.

// The chunk of the bot.
bot.on('message', message => {
    //if (message.author.id != 110128099361849344){ for testing
     //   return;
    //}
    if (message.channel.type == "dm"){ // for pms, maybe reply but make sure it's not responding to itself.
        return(console.log("A message was sent through a DM and has been ignored."));
    }
    tempMessage = "";
    for (i=0;i<message.content.length;i++){ // remove all multiple white spaces
        if (message.content.charAt(i) != ' '){
            tempMessage += message.content.charAt(i);
        }
        else{
            if (!(tempMessage.charAt(tempMessage.length-1) == " ")){
                tempMessage += message.content.charAt(i);
            }
        }
    }
    message.content = tempMessage;
    PREFIX = guildSettings.get(message.guild.id, "prefix");
    if (!message.content.startsWith(PREFIX)){
        return;
    }
    let args = message.content.substring(PREFIX.length).split(" ");
    switch(args[0]){
        case 'initialize':
                if(guildSettings.get(message.guild.id, "schedulerRole") != null){
                    message.reply("It seems you have already initialized the bot's settings. Check them with !settings.");
                    break;
                }
                guildSettings.set(message.guild.id, message.guild.roles.find(role => role.name === "Scheduler").id, "schedulerRole"); // sets the scheduler role to the custom created one by ID
                guildSettings.set(message.guild.id, message.guild.roles.find(role => role.name === "Player").id, "playerRole");
                guildSettings.set(message.guild.id, message.channel.id, "botChannel");
                message.reply("Your settings have been initialized. Check them with !settings.");
                break;
        case 'info':
                message.channel.send("Virtual McSlap is named after my cLoL team's manager, McSlap. His purpose is to store scrims and alert players when they are coming up. *Use !initialize to finish setting up the scheduler and player role*.");
                message.channel.send(botDescription() + "\n*Creator's Note*: This is a bot I built as a summer project. If you find any bugs or have any suggestions, feel free to add me on discord **chriss#8261**");
                break;
        case 'schedule': // prints out the scrim schedule
                scrimSchedule = organizeSchedule(message.guild.id);
                printSchedule(scrimSchedule,message);
                break;
        case 'trueschedule':
                scrimSchedule = organizeSchedule(message.guild.id);
                for (i=0;i<scrimSchedule.length;i++){
                    message.channel.send(scrimSchedule[i].toString());
                }
                break;
        case 'scrim': // !scrim January 31 5:00PM EST [TEAM_NAME] [OP.GG]
                validInput = /[!][\S]+\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{1,2}\s+[\d]{1,2}[:][\d]{2}(AM|PM|am|pm)?\s+[\S]+(\s\S+){0,5}\s+(https:\/\/na.op.gg\/)[\S]+/ //() NOW ALLOWS UP TO TWO
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is !scrim January 1 5:00PM <team> <opgg>");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                month = args[1];
                day = args[2];
                time = args[3];
                team = "";
                for (i=4;i<args.length-1;i++){ // add between TIME(arg[3]) and last element
                    team += args[i];
                    if (i != args.length-2){ // add a space between them
                        team += " ";
                    }
                }
                OPGG = args[args.length-1] // the last element
                scrimAdded =  "`" +month + " " + day + " " + time + " vs. " + team + " has been added. `";
                try{
                // console.log(scrimAdded);
                    date = CreateDate(month, day, new Date().getFullYear(), time, guildSettings.get(message.guild.id, "timezone"));
                    //console.log(date.toString());
                }
                catch(error){
                    console.log(error);
                    message.channel.send(error);
                    break;
                }
                scrimSchedule = buildScrimArray(getSchedule(message.guild.id));
                scrimToBeAdded = new Scrim(date, team, OPGG);
                if (scrimSchedule[0] == null){ // if the first element is null
                    scrimSchedule[0] = scrimToBeAdded;
                }
                else{
                    scrimSchedule.push(scrimToBeAdded);
                }
                updateDatabase(message.guild.id, scrimSchedule); // updates the database
                message.channel.send(scrimAdded);
                break;
        case 'addGuild':
                if (!(message.author.id == "110128099361849344")){
                    //message.reply("You are not authorized to use this command.");
                    break;
                }
                createServer(message.guild.id,[]);
                message.reply("Guild " + message.guild.id + " ensured in the enmap.");
                break;
        case 'removeGuild':
                if (!(message.author.id == "110128099361849344")){
                    //message.reply("You are not authorized to use this command.");
                    break;
                }
                createServer(message.guild.id,[]);
                message.reply("Guild " + message.guild.id + " removed in the enmap.");
                break;
        case 'reschedule':
                validInput = /[!][\S]+\s+[\S]+(\s\S+){0,5}\s+(January|Feburary|March|April|May|June|July|August|September|October|November|December)\s[0-3]?[\d]\s[\d]{1,2}:[\d]{2}(PM|AM)/;
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!reschedule Name Month Day Time.\" ex. \"!reschedule <name> May 20 9:30PM\"");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                // build the team name, args 1 -> args[n-3], time is n-1, date # is n-2, month is n-3
                team = "";
                for (i=1;i<args.length-3;i++){
                    team += args[i];
                    if (i != args.length-4){ // add a space between them except the last one
                        team += " ";
                    }
                }
                console.log(team);
                scrimSchedule = buildScrimArray(getSchedule(message.guild.id));
                indexToBeEdited = findIndexByName(team,scrimSchedule);
                if (indexToBeEdited == -1){
                    message.reply("We could not find a scrim in your schedule by that name.");
                }
                //console.log(args[2], args[3], scrimSchedule[indexToBeEdited].date.getFullYear().toString(), args[4]);
                else{
                    scrimToBeEdited = scrimSchedule[indexToBeEdited];
                    try{
                        dateAdd = CreateDate(args[args.length-3], args[args.length-2], scrimToBeEdited.date.getFullYear().toString(), args[args.length-1], guildSettings.get(message.guild.id, "timezone"));
                        message.channel.send("The scrim's date has been successfully edited.");
                    }
                    catch(error){
                        console.log(error);
                        message.channel.send("There was an error editing the date. Verify you inputted a valid time.");
                        break;
                    }
                    scrimSchedule[indexToBeEdited].date = dateAdd;
                }
                updateDatabase(message.guild.id, scrimSchedule);
                break;
        case 'remove':
                validInput = /[!][\S]+\s[\S]+/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!remove <team>\"");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                scrimSchedule = buildScrimArray(getSchedule(message.guild.id));
                indexToBeRemoved = findIndexByName(args[1],scrimSchedule);
                console.log(indexToBeRemoved);
                if (indexToBeRemoved == -1){
                    message.reply("We could not find a scrim in your schedule by that name.");
                    break;
                }
                scrimSchedule = removeFromSchedule(parseInt(indexToBeRemoved),scrimSchedule); // maybe needs -1
                if (scrimSchedule == -1){
                    message.reply("Multiple scrims have been removed.");
                }
                message.channel.send("A scrim has successfully been removed!");
                updateDatabase(message.guild.id, scrimSchedule);
                break;
        case 'nextScrim':
                scrimSchedule = organizeSchedule(message.guild.id);
                message.channel.send("The next scrim is... \n" + scrimSchedule[0].toString());
                break;
        case 'clearSchedule':
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                guildScrims.set(message.guild.id, []);
                message.reply("The schedule has been cleared.");
                break;
        case 'ping':
                message.reply('pong');
                break;
        case 'izan':
                message.reply('okay fine');
                break;
        case 'changePrefix':
                validInput = /[!][\S]+\s[\S]+/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!changePrefix $\"");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                guildSettings.set(message.guild.id, args[1], "prefix");
                message.channel.send("Your server's prefix has been updated to " + args[1] + " successfully.");
                break;
        case 'changeTimezone':
                validInput = /[!][\S]+\s(EST|EDT|PST|PDT|MST|MDT|CST|CDT)/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!changeTimezone PST.\"");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                guildSettings.set(message.guild.id, args[1], "timezone");
                message.reply("Successfully changed the timezone.");
                break;
        case 'setBotChannel':
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                guildSettings.set(message.guild.id, message.channel.id, "botChannel");
                console.log(message.channel.id);
                message.channel.send("Virtual McSlap will now send scrim alerts in this channel.");
                break;
        case 'setSchedulerRole':
                validInput = /[!][\S]+\s[\S]+/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!setSchedulerRole RoleName\"");
                    break;
                }
                try{
                    newRole = message.guild.roles.find(role => role.name === args[1]);
                    guildSettings.set(message.guild.id, newRole.id, "schedulerRole");
                    message.reply("The scheduler role has successfully been changed to " + args[1]);
                }
                catch{
                    message.reply("I couldn't find that role in your server.");
                    break;
                }
                break;
        case 'setPlayerRole':
                validInput = /[!][\S]+\s[\S]+/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!changePrefix $\"");
                    break;
                }
                if (!isScheduler(message)){ // checks permission breaks if not allowed.
                    break;
                }
                try{
                    playerRole = message.guild.roles.find(role => role.name === args[1]);
                }
                catch(err){
                    message.reply("The role could not be found.");
                    break;
                }
                guildSettings.set(message.guild.id, playerRole.id, "playerRole");
                message.channel.send("The player role has been changed to " + args[1]);
                break;
        case 'settings':
                message.channel.send("**Settings for " + message.guild.name + " **");
                message.channel.send("Prefix: "  + (guildSettings.get(message.guild.id,"prefix")));
                message.channel.send("Timezone: " + (guildSettings.get(message.guild.id,"timezone")));
                message.channel.send("Scheduler Role: " + (message.guild.roles.get(guildSettings.get(message.guild.id,"schedulerRole"))));
                message.channel.send("Player Role: " + (message.guild.roles.get(guildSettings.get(message.guild.id,"playerRole"))));
                botChannelName = "undefined";
                try{
                    botChannelName = message.guild.channels.get(guildSettings.get(message.guild.id,"botChannel")).name;
                    message.channel.send("Bot Channel: " + botChannelName);
                    break;
                }
                catch(error){
                    message.channel.send("Bot Channel: " + botChannelName);
                    break;
                }
        // Dev stuff
        case 'now':
                timezone = guildSettings.get(message.guild.id, "timezone");
                message.reply(makeReadableDate(formatDate(new Date(), timezone)) + " " + timezone);
                break;
        case 'checkConnection':
                if (guildScrims.has(message.guild.id)){
                    message.reply("The connection to the database is active.");
                }
                else{
                    message.reply("The connection to the database is inactive. Contact me.");
                }
                break;
        case 'showServers':
                if (!(message.author.id == "110128099361849344")){
                    //message.reply("You are not authorized to use this command.");
                    break;
                }
                keyArr = guildScrims.keyArray();
                console.log(keyArr);
                message.reply(keyArr.length + " servers using Virtual McSlap:");
                for (i=0; i<keyArr.length;i++){
                    message.channel.send("**"+ bot.guilds.get(keyArr[i]) + "** : " + keyArr[i] + "    `Scrims scheduled: " + guildScrims.get(keyArr[i]).length + "`");
                }
                break;
        case 'showSchedule':
                if (!(message.author.id == "110128099361849344")){
                    //message.reply("You are not authorized to use this command.");
                    break;
                }
                validInput = /[!][\S]+\s[\d]+/;// //()
                if (!message.content.match(validInput)){
                    message.channel.send("The input was invalid. The correct format is \"!showSchedule <id>.\"");
                    break;
                }
                scrimSchedule = organizeSchedule(args[1]);
                console.log(bot.guilds.get(args[1]).name);
                message.channel.send("**"+bot.guilds.get(args[1]).name+"**: \n");
                printSchedule(scrimSchedule, message);
                break;
        case 'checkNow':
                if (!(message.author.id == "110128099361849344")){
                    message.reply("You are not authorized to use this command.");
                    break;
                }
                keyArr = guildScrims.keyArray();
                for (j=0;j < keyArr.length; j++){ // for each server
                        server = bot.guilds.get(keyArr[j]);
                        console.log("Inspecting: " + server.name);
                        channel = bot.guilds.get(server.id).channels.get(guildSettings.get(server.id,"botChannel")); // set to the custom bot channel
                        if (channel == undefined){
                            try{
                                channel = server.channels.find(channel => channel.name === "general");// find the text channel named general
                            }
                            catch{
                                guild.channels.sort(function(chan1,chan2){
                                    if(chan1.type!==`text`) return 1;
                                    if(!chan1.permissionsFor(guild.me).has(`SEND_MESSAGES`)) return -1;
                                    return chan1.position < chan2.position ? -1 : 1;
                                }).first().send(`We could not find a server to send messages to. Make sure you assign a bot channel or have a "general" text channel.`);
                                continue;
                            }
                        }
                        scrimSchedule = buildScrimArray(getSchedule(guildScrims.keyArray()[j]));
                        var currentTime = new Date();
                        for (i=0;i<scrimSchedule.length;i++){
                                console.log("Inspecting the scrim " + scrimSchedule[i].team + " " + scrimSchedule[i].date);
                                var timer = (scrimSchedule[i].date).getTime() - currentTime;
                                console.log(timer);
                                if (timer <= 0) { // tags the @Player role and sends a message. 0 or less
                                    channel.send("<@&"+guildSettings.get(server.id, "playerRole") +"> `"+ makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening now! Removing it from the scrim schedule.` \n" + scrimSchedule[i].OPGG);
                                    scrimSchedule = removeFromSchedule(i, scrimSchedule);
                                    if (scrimSchedule == -1){
                                        message.reply("Multiple scrims have been removed.");
                                    }
                                    console.log(scrimSchedule);
                                }
                                else if (timer < 1800000 && timer > 900000){ // 15-30 min
                                   channel.send("<@&"+guildSettings.get(server.id, "playerRole")+"> `" +  makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening in the next 30 minutes. Get ready. `");
                                }
                                else if (timer < 3600000 && timer > 2700000){ // 45 min- 1 hour
                                    channel.send("<@&"+guildSettings.get(server.id, "playerRole") + "> `" + makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening within the hour. Be there.`");
                                }
                        }
                        updateDatabase(guildScrims.keyArray()[j], scrimSchedule);
                    }
                break;
    }
})

// Functions
// Returns a string which is an informative list of valid commands
function botDescription(){
    var basicCommands = { 
        // Basic commands
            "!info" : "Returns a list of supported commands.",
            "!schedule" : "Returns all scheduled scrims.",
            "!nextScrim" : "Returns the next scrim.",
            "!settings" : "Returns the servers customizable settings.",
            "!now" : "Returns the current time in the set time zone",
        }
    var schedulerCommands = {
           // Scheduling commands
            "!scrim" : "Schedules a scrim based on the following format (!scrim January 1 5:00PM *team* *OP.GG*)",
            "!reschedule" : "Edits the time of the specified scrim. Refer to schedule for the name. (ex. !reschedule *team* May 20 3:50PM)",
            "!remove" : "Removes a scrim based on the given name. Refer to schedule for the name. (ex. !remove *team*)",
            "!clearSchedule" : "Clears the entire schedule.",
    }
    var configCommands = {
            // Config commands
            "!changePrefix" : "Change the prefix to whatever you want. (ex. !changePrefix $)",
            "!changeTimezone" : "Changes the timezone. **It's defaulted to EST** but change yours to what you need (EST/EDT/PST/PDT/MST/MDT/CST/CDT) to get accurate readings / writings.",
            "!setPlayerRole" : "The player role is tagged when there are upcoming scrims. (ex. !setPlayerRole Players)",
            "!setBotChannel" : "Sets the channel where the message was sent as the Bot Channel. Schedule alerts will be sent to the bot channel.",
    }
    strToReturn = "__**Basic commands**__ \n";
    Object.entries(basicCommands).forEach(([key, value]) => {
        strToReturn += "**"+key+"**" + " - " + value + "\n";
     });

    strToReturn += "\n__**Scheduler commands (requires the Scheduler role)**__\n";
    Object.entries(schedulerCommands).forEach(([key, value]) => {
        strToReturn += "**"+key+"**" + " - " + value + "\n";
    });
    strToReturn += "\n__**Setting commands (requires the Scheduler role)**__ \n";
    Object.entries(configCommands).forEach(([key, value]) => {
        strToReturn += "**"+key+"**" + " - " + value + "\n";
    });
    return (strToReturn);
}

function removeFromSchedule(index,scrimSchedule){ // Removes an index from the scrim schedule.
    try{
        scrimSchedule.splice(index,1);
        return scrimSchedule;
    }
    catch(error){
        console.log(error);
        return -1;
    }

}

function organizeSchedule(guildid){ // SORTING METHODS LOL
    scrimSchedule = buildScrimArray(getSchedule(guildid));
    scrimSchedule.sort(function(a,b){
        return 0-(new Date(b.date) - new Date(a.date));
      });
    return scrimSchedule;
}

function findIndexByName(team, schedule){ // Returns the index of the team matching the given name, -1 if not found.
    for (i=0;i<schedule.length;i++){
        if (team == schedule[i].team){
            return i;
        }
    }
    return -1;
}

function buildScrimArray(jsonArray){ // Builds and returns a schedule based on an array of Scrim objects.
    schedule = [];
    if (jsonArray == null){
        jsonArray = [];
    }
    for (i=0;i<jsonArray.length;i++){
        schedule.push(new Scrim(new Date(jsonArray[i].date),jsonArray[i].team,jsonArray[i].OPGG));
    }
    return schedule;
}

function printSchedule(scrimSchedule, message){ // Prints the schedule in a readable format.
    if (scrimSchedule.length == 0){
        message.channel.send("`There are no scrims currently scheduled!`");
    }
    for (i=0;i<scrimSchedule.length;i++){
       //console.log(scrimSchedule[i].date.toString());
        formattedDate = formatDate(scrimSchedule[i].date, guildSettings.get(message.guild.id, "timezone")); // format the date into a string based on the timezone
        //console.log(formattedDate.toString());
        message.channel.send("["+(i+1)+"] **" + makeReadableDate(formattedDate) +" " + guildSettings.get(message.guild.id, "timezone") + "**\n" + "       " + scrimSchedule[i].team + ": " + scrimSchedule[i].OPGG);
    }
} 

function makeReadableDate(dateObject){ // takes in date object -> returns readable string
    var pm = false;
    var readableHours = parseInt(dateObject.getHours());
    var readableMinutes = "";
    if (readableHours > 12){
        readableHours = readableHours-12;
        pm = true;
    }
    if (readableHours == 12){
        pm = true;
    }
    if (readableHours == 0){ // to account for the case of 00:00:00
        readableHours = 12;
    }
    if (dateObject.getMinutes() !=0){ // if 0, then only need to print out the hour, leave readable minutes blank.
        var minutes = dateObject.getMinutes();
        if (parseInt(minutes)<10){
            minutes = "0" + minutes;
        }
        var readableMinutes = ":" + minutes;
    }
    var readableDate = weekday[dateObject.getDay()] + ", " + months[dateObject.getMonth()] + " " + dateObject.getDate() + " at " + readableHours.toString() + readableMinutes;
    // Puts PM / AM Based on if hours > 12
    if (pm == true){
        readableDate += "PM";
    }
    else{
        readableDate += "AM";
    }
    return (readableDate);
}
function formatDate(dateObject, timezone){ // adjust the hours based on the timezone
    hoursInEST = dateObject.getHours(); // getHours retrives it in either EST or EDT, this could become a problem once it swaps.
    switch (timezone){
        case 'EST':
            formattedHours = hoursInEST - 1;
            break;
        case 'EDT':
            formattedHours = hoursInEST + 0;
            break;
        case 'CST':
            formattedHours = hoursInEST - 2;
            break;
        case 'CDT':
            formattedHours = hoursInEST - 1;
            break;
        case 'MST':
            formattedHours = hoursInEST - 3;
            break;
        case 'MDT':
            formattedHours = hoursInEST - 2;
            break;
        case 'PST':
            formattedHours = hoursInEST - 4;
            break;
        case 'PDT':
            formattedHours = hoursInEST - 3;
            break;
        default:
            formattedHours = hoursInEST;
            break;
    }
    dateObject.setHours(formattedHours);
    return(dateObject);
}

function updateDatabase(guildid, scrimSchedule){ // pushes onto the array within the scrim schedule of the given id
    guildScrims.set(guildid, scrimSchedule);
}
function isScheduler(message){ // sees if the message was written by someone with the scheduler role
    if (message.member.roles.has(guildSettings.get(message.guild.id, "schedulerRole"))){
        return true;
    }
    else{
        try{
            roleName = message.guild.roles.get(guildSettings.get(message.guild.id, "schedulerRole")).name;
            message.reply("Only " + roleName + " are allowed to use this command.");
            return false;
        }
        catch(error){
            message.reply("Something went wrong! Use !initialize and try again.");
        }
    }
}


// Loads the scrim information from the .json and adds new scrim objects.
function getSchedule(guildid){
    return guildScrims.get(guildid); // loads onto scrim schedule based on given guild id
}



// A Scrim object with a date and time
class Scrim { 
    constructor(date, team, OPGG){
        this.date = date;
        this.team = team;
        this.OPGG = OPGG;
        this.readableDate = makeReadableDate(date);
    }
    
    removingString(){ // more simplified format for when it's removed
        return (this.readableDate + " scrim vs. " + this.team);
    }
    toString(){ // Converts the date into a custom format and prints it out.
        return "**" + this.readableDate + "**" + "\n" + "      " + this.team + ": " + this.OPGG;
    }
}

// Create a Date Object for a scrim 
function CreateDate(Month, Day, Year, Time, timezone){
    pm = true; // pm is true by default
    if (Time.includes("AM") | Time.includes("am")){
        console.log("setting pm to false");
        pm = false;
    }
    console.log("PM = " + pm);
    // Replace any non-digit with '';
    Time = Time.replace(/[A-Z]+/, ""); // get rid of any letters (PM/AM)
    Time = Time.replace(/[a-z]+/, ""); // get rid of any lowercase (pm/am)
    time = Time.split(":");
    // If it's in the format of 8:30 -> 08:30
    if (Time[0].length == 1){
        hour = "0" + time[0];
    }
    else{
        hour = time[0];
    }
    minute = time[1];
    // checks for range
    if (parseInt(hour) > 12){ 
        throw "Hours not given in a valid range.";
    }
    if (parseInt(minute) > 59){
        throw "Minutes not given in a valid range.";
    }
    // Add 12 if its in the PM
    if (pm == true) { // avoid 24:30
        if (!(parseInt(hour) ==  12)){
            hour = (parseInt(hour) + 12).toString();
        }
    }
    else{ // else its AM and 12 == 00
        if (parseInt(hour) ==  12){
            hour = "00";
        }
    }
    timeOffset = "+00:00" // default to UTC
    switch (timezone){
        case 'EST':
            timeOffset = "-05:00"; // -1
            break;
        case 'EDT':
            timeOffset = "-04:00"; // - 0
            break;
        case 'CST':
            timeOffset = "-06:00"; // -2
            break;
        case 'CDT':
            timeOffset = "-05:00"; // -1
            break;
        case 'MST':
            timeOffset = "-07:00"; // -3
            break;
        case 'MDT':
            timeOffset = "-06:00"; // -2
            break;
        case 'PST':
            timeOffset = "-08:00";// -4
            break;
        case 'PDT':
            timeOffset = "-07:00"; // -3
            break;
    }
    // Creates a date object and returns it
    dateStr = Month + " " + Day + ", " + Year + " " + hour +":"+minute+":00 GMT" + timeOffset; // i think this makes all dates be in EST?
    var date = new Date(dateStr)
    console.log("A date was created of: " + dateStr);
    return date;
}



// To convert day # -> Day
var weekday=new Array(7);
weekday[0]="Sunday";
weekday[1]="Monday";
weekday[2]="Tuesday";
weekday[3]="Wednesday";
weekday[4]="Thursday";
weekday[5]="Friday";
weekday[6]="Saturday";

// To convert month # -> Month
var months = new Array(12);
months[0] = "January";
months[1] = "February";
months[2] = "March";
months[3] = "April";
months[4] = "May";
months[5] = "June";
months[6] = "July";
months[7] = "August";
months[8] = "September";
months[9] = "October";
months[10] = "November";
months[11] = "December";





// change this based on the role you want to tag in the messages

// Checks if scrim is soon every 15 minutes also saves the scrims into the json
bot.on('ready', function(){
        setInterval(function(){
            keyArr = guildScrims.keyArray();
                for (j=0;j < keyArr.length; j++){ // for each server
                        server = bot.guilds.get(keyArr[j]);
                        console.log("Inspecting: " + server.name);
                        channel = bot.guilds.get(server.id).channels.get(guildSettings.get(server.id,"botChannel")); // set to the custom bot channel
                        if (channel == undefined){
                            try{
                                channel = server.channels.find(channel => channel.name === "general");// find the text channel named general
                            }
                            catch{
                                guild.channels.sort(function(chan1,chan2){
                                    if(chan1.type!==`text`) return 1;
                                    if(!chan1.permissionsFor(guild.me).has(`SEND_MESSAGES`)) return -1;
                                    return chan1.position < chan2.position ? -1 : 1;
                                }).first().send(`We could not find a server to send messages to. Make sure you assign a bot channel or have a "general" text channel.`);
                                continue;
                            }
                        }
                        scrimSchedule = buildScrimArray(getSchedule(guildScrims.keyArray()[j]));
                        var currentTime = new Date();
                        for (i=0;i<scrimSchedule.length;i++){
                                console.log("Inspecting the scrim " + scrimSchedule[i].team + " " + scrimSchedule[i].date);
                                var timer = (scrimSchedule[i].date).getTime() - currentTime;
                                console.log(timer);
                                if (timer <= 0) { // tags the @Player role and sends a message. 0 or less
                                    channel.send("<@&"+guildSettings.get(server.id, "playerRole") +"> `"+ makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening now! Removing it from the scrim schedule.` \n" + scrimSchedule[i].OPGG);
                                    scrimSchedule = removeFromSchedule(i, scrimSchedule);
                                    if (scrimSchedule == -1){
                                        message.reply("Multiple scrims have been removed.");
                                    }
                                    console.log(scrimSchedule);
                                }
                                else if (timer < 1800000 && timer > 900000){ // 15-30 min
                                   channel.send("<@&"+guildSettings.get(server.id, "playerRole")+"> `" +  makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening in the next 30 minutes. Get ready. `");
                                }
                                else if (timer < 3600000 && timer > 2700000){ // 45 min- 1 hour
                                    channel.send("<@&"+guildSettings.get(server.id, "playerRole") + "> `" + makeReadableDate(formatDate(scrimSchedule[i].date, guildSettings.get(server.id,"timezone"))) + " is happening within the hour. Be there.`");
                                }
                        }
                        updateDatabase(guildScrims.keyArray()[j], scrimSchedule);
                    }}, 900000); // <--- Interval of the check, currently 15 minutes.
    });




bot.login(token);