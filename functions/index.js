exports.onWorkApproved = functions.firestore
    .document("works/{workId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        if (newData.status === 'completed' && oldData.status !== 'completed') {
            const influencerId = newData.influencerId;
            const budget = newData.budget;
            const profit = budget * 0.90; // 90% profit

            const influencerRef = db.doc(`users/${influencerId}`);
            
            // Use a transaction to safely update the balance
            return db.runTransaction(async (transaction) => {
                const influencerDoc = await transaction.get(influencerRef);
                const currentBalance = influencerDoc.data().influencerBalance || 0;
                const newBalance = currentBalance + profit;
                
                transaction.update(influencerRef, { influencerBalance: newBalance });
            });
        }
        return null;
    });
