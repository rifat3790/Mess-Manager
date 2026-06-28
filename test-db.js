const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://developerimran1:Kq2V0bN1hV6lJ6bE@cluster0.p1bep0o.mongodb.net/messManager?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const User = mongoose.connection.collection('users');
  const ChatMessage = mongoose.connection.collection('chatmessages');
  
  const users = await User.find().toArray();
  for (let user of users) {
    console.log('User:', user.name);
    console.log('lastGroupChatRead:', user.lastGroupChatRead);
    const unreadG = await ChatMessage.countDocuments({ isGroup: true, createdAt: { $gt: user.lastGroupChatRead || new Date(0) } });
    console.log('Unread Group:', unreadG);
    const unreadD = await ChatMessage.countDocuments({ isGroup: false, receiverId: user._id, isRead: false });
    console.log('Unread Direct:', unreadD);
    console.log('---');
  }
  process.exit(0);
});
