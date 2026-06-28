const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://developerimran1:Kq2V0bN1hV6lJ6bE@cluster0.p1bep0o.mongodb.net/messManager?retryWrites=true&w=majority&appName=Cluster0');
  
  const User = mongoose.connection.collection('users');
  const ChatMessage = mongoose.connection.collection('chatmessages');
  
  // Find a user who has unread messages
  const user = await User.findOne({ name: 'Md Refayet Hossen' }); // based on screenshot
  if (user) {
    console.log('User:', user.name, user._id);
    console.log('lastGroupChatRead:', user.lastGroupChatRead);
    
    const unreadG = await ChatMessage.countDocuments({ isGroup: true, createdAt: { $gt: user.lastGroupChatRead || new Date(0) } });
    console.log('Unread Group:', unreadG);
    
    const unreadD = await ChatMessage.countDocuments({ isGroup: false, receiverId: user._id, isRead: false });
    console.log('Unread Direct:', unreadD);
    
    if (unreadD > 0) {
       console.log('Found unread direct message!');
       const unreadMsg = await ChatMessage.findOne({ isGroup: false, receiverId: user._id, isRead: false });
       console.log('Unread msg sender:', unreadMsg.senderId, 'msg:', unreadMsg.message);
    }
  } else {
    console.log('User not found');
  }
  
  process.exit(0);
}

check();
