/* ============================================
   FIREBASE CONFIGURATION (CDN / Compat Mode)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAXzcHqj9zZDPHnT9ZfOrMSLgH7rBwgWCg",
  authDomain: "splitzo-3b1eb.firebaseapp.com",
  projectId: "splitzo-3b1eb",
  storageBucket: "splitzo-3b1eb.firebasestorage.app",
  messagingSenderId: "716738420628",
  appId: "1:716738420628:web:b95f6ace097c6cbe06f981",
  measurementId: "G-SEWERVE4LX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Service references
const auth = firebase.auth();
const db   = firebase.firestore();

/* ── Firestore Helper Functions ────────────── */

const DB = {
  /* ---------- Users ---------- */
  async createUser(uid, data) {
    await db.collection('users').doc(uid).set({
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      upiId: data.upiId || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getUser(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getUserByEmail(email) {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
  },

  async updateUser(uid, data) {
    await db.collection('users').doc(uid).set({
      name: data.name,
      phone: data.phone || '',
      upiId: data.upiId || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  /* ---------- Groups ---------- */
  async createGroup(data) {
    const ref = await db.collection('groups').add({
      name: data.name,
      members: data.members,          // [{ name, email, uid? }]
      createdBy: data.createdBy,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },

  async joinGroupFromInvite(groupId, userEmail, userName, pendingPhone) {
    const groupRef = db.collection('groups').doc(groupId);
    const doc = await groupRef.get();
    if (!doc.exists) throw new Error("Group not found");
    
    const data = doc.data();
    const members = data.members || [];
    
    // Check if user is already officially a member (by email)
    if (members.find(m => m.email === userEmail)) return true; // already joined
    
    // If we have a pendingPhone, let's find the placeholder member and upgrade it
    let updated = false;
    if (pendingPhone) {
      const matchIndex = members.findIndex(m => {
        if (!m.phone) return false;
        let dbPhone = m.phone.replace(/[^0-9]/g, '');
        if (dbPhone.length === 10) dbPhone = '91' + dbPhone;
        return dbPhone === pendingPhone.replace(/[^0-9]/g, '');
      });
      
      if (matchIndex !== -1) {
        // Fetch user doc to get their UPI ID if they have one
        let userDocData = {};
        try {
          // Use userEmail since we don't have uid here (though we could pass it)
          // Actually, we can just fetch via email if we indexed it, or better, pass the uid to this function.
          // Let's assume we can fetch by searching for the email or that it's okay to just use what we have in sessionStorage.
          const userSnap = await db.collection('users').where('email', '==', userEmail).get();
          if (!userSnap.empty) {
            userDocData = userSnap.docs[0].data();
          }
        } catch(e) {}

        // Upgrade the pending member
        members[matchIndex].email = userEmail;
        members[matchIndex].name = userName; 
        members[matchIndex].upiId = userDocData.upiId || ''; // Copy their UPI ID
        members[matchIndex].status = 'Joined';
        updated = true;
      }
    }
    
    // STRICT SECURITY
    if (!updated) {
      throw new Error("Unauthorized Access: You have not been specifically invited to this group.");
    }

    await groupRef.update({ members });
    return true;
  },
  
  async manualJoinGroup(groupId, userEmail, userName, upiId) {
    const groupRef = db.collection('groups').doc(groupId);
    const doc = await groupRef.get();
    if (!doc.exists) throw new Error("Group not found. Check the ID again.");
    
    const data = doc.data();
    const members = data.members || [];
    
    if (members.find(m => m.email === userEmail)) throw new Error("You are already a member of this group.");
    
    // Add new member
    members.push({
      name: userName,
      email: userEmail,
      upiId: upiId || '',
      status: 'Joined'
    });
    
    await groupRef.update({ members });
    return { id: doc.id, name: data.name };
  },

  async getGroupsForUser(email) {
    const snap = await db.collection('groups')
      .where('members', 'array-contains', email)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getGroupsByMemberEmail(email) {
    // Query groups where any member has the given email
    const snap = await db.collection('groups').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(g => {
        if (!g.members) return false;
        return g.members.some(m =>
          (typeof m === 'string' && m === email) ||
          (typeof m === 'object' && m.email === email)
        );
      });
  },

  async getGroup(groupId) {
    const doc = await db.collection('groups').doc(groupId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  /* ---------- Expenses ---------- */
  async addExpense(groupId, data) {
    const ref = await db.collection('groups').doc(groupId)
      .collection('expenses').add({
        title: data.title,
        amount: Number(data.amount),
        currency: data.currency || 'INR',
        paidBy: data.paidBy,
        date: data.date,
        splitType: data.splitType,
        splitDetails: data.splitDetails || {},
        recurring: data.recurring || false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    return ref.id;
  },

  async getExpenses(groupId) {
    const snap = await db.collection('groups').doc(groupId)
      .collection('expenses')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /* ---------- Contact Messages ---------- */
  async sendContactMessage(data) {
    await db.collection('contactMessages').add({
      name: data.name,
      email: data.email,
      message: data.message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
};
