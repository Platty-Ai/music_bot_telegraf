const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();
const path = require('path');

// Initialize bot with your token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Bot welcome message
bot.start((ctx) => {
    console.log('Start command triggered');
    const welcomeMessage = `
🎵 Welcome to Music Assistant!
    
Use /play <song name> to start playing music
Current supported platforms:
- YouTube
- Spotify (Coming soon)

Type /help to see all available commands
`;
    return ctx.replyWithPhoto({ source: path.join(__dirname, '../public/plattyAI.jpg') }, { caption: welcomeMessage });
});

// Help command
bot.command('help', (ctx) => {
    const helpMessage = `
Available commands:
/play <song name> - Play a song
/pause - Pause current song (In progress)
/resume - Resume playback (In progress)
/skip - Skip to next song
/stop - Stop playback (In progress)
/status - Show current playing song
`;
    return ctx.reply(helpMessage);
});

// Handle play command
bot.command('play', async (ctx) => {
    try {
        const query = ctx.message.text.split('/play ')[1];
        console.log('Play command received with query:', query);

        if (!query) {
            return ctx.reply('Please provide a song name. Usage: /play <song name>');
        }

        // Check the chat type
        if (ctx.chat.type === 'private') {
            return ctx.reply('This action is not supported in private chats. Please use this command in a group or supergroup.');
        }

        // Check if bot is in the group
        // const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
        // console.log('Chat member status:', chatMember.status);

        // if (!chatMember || chatMember.status === 'left') {
        //     return ctx.reply('Please add me to the group first!');
        // }

        // Send "processing" message
        const processingMsg = await ctx.reply('🎵 Processing your request...');

        // Make request to music server with updated parameters
        const response = await axios.post(`${process.env.GOOGLE_CLOUD_URL}/play_music/`, {
            query: query,
            chat_username: ctx.chat.username, // Changed from chat_id to chat_username
            video: true
        });

        console.log('Music server response:', response.data);

        // Update message based on response
        if (response.data.success) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                `🎵 Now playing: ${query}\nDuration: ${response.data.duration || 'Unknown'}`
            );
            // } else {
            //     ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
            //     await ctx.telegram.editMessageText(
            //         ctx.chat.id,
            //         processingMsg.message_id,
            //         null,
            //         '❌ Failed to play song. Please try again.'
            //     );
        }
    } catch (error) {
        console.error('Error in play command:', error);
        ctx.reply('An error occurred while processing your request. Please try again.');
    }
});

// Status command
bot.command('status', async (ctx) => {
    try {
        const chatQueryUsername = ctx.from.first_name;
        const chatUsername = ctx.chat.username;
        const response = await axios.get(`${process.env.GOOGLE_CLOUD_URL}/queue/${chatUsername}`);
        const queueInfo = response.data;
        console.log(queueInfo);

        let message = '';

        if (queueInfo.current_song) {
            const { title, duration, started_at } = queueInfo.current_song;

            // Convert duration to minutes and seconds
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            // Convert started_at to a readable time
            const startTime = new Date(started_at * 1000).toLocaleTimeString();

            message += `Streaming :\n\n✨ Title : ${title}\nDuration : ${minutes}:${seconds < 10 ? '0' : ''}${seconds}\nBy : ${chatQueryUsername}\n\n`;
        } else {
            message += 'No songs are currently playing.\n\n';
        }

        if (queueInfo.queued_songs && queueInfo.queued_songs.length > 0) {
            message += 'Queued :\n\n';
            queueInfo.queued_songs.forEach((song, index) => {
                const { title, duration } = song;

                // Convert duration to minutes and seconds
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;

                message += `✨ Title : ${title}\nDuration : ${minutes}:${seconds < 10 ? '0' : ''}${seconds}\nBy : ${chatUsername}\n\n`;
            });
        } else {
            message += 'No songs are currently queued.';
        }

        ctx.reply(message);
    } catch (error) {
        console.error('Error in status command:', error);
        ctx.reply('An error occurred while fetching the queue status. Please try again.');
    }
});

// Skip command
bot.command('skip', async (ctx) => {
    try {
        const chatUsername = ctx.chat.username;
        const response = await axios.post(`${process.env.GOOGLE_CLOUD_URL}/skip/${chatUsername}`);
        const result = response.data;

        if (result.status === 'success') {
            ctx.reply('⏭ Skipped the current song.');
        } else {
            ctx.reply(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('Error in skip command:', error);
        ctx.reply('An error occurred while trying to skip the song. Please try again.');
    }
});

// Handle pause command
bot.command('pause', (ctx) => {
    // Implementation for pause functionality
    console.log('Pause command triggered');
    ctx.reply('⏸ Playback paused');
});

// Handle resume command
bot.command('resume', (ctx) => {
    // Implementation for resume functionality
    console.log('Resume command triggered');
    ctx.reply('▶️ Playback resumed');
});

// Handle stop command
bot.command('stop', (ctx) => {
    // Implementation for stop functionality
    console.log('Stop command triggered');
    ctx.reply('⏹ Playback stopped');
});

module.exports = async (request, response) => {
    try {
      if (request?.body) {
        console.log(request.body);
        await bot.handleUpdate(request.body);
      }
    } catch (error) {
      console.error("Error handling update", error.message);
    }
    response.send("OK");
  };