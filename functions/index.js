const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function that triggers when a 'works' document is updated.
 * If the work's status changes to 'completed', it calculates the influencer's
 * 90% profit and safely adds it to their 'influencerBalance'.
 */
exports.onWorkApproved = functions.firestore
    .document("works/{workId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const workId = context.params.workId;

        console.log(`Work document ${workId} was updated.`);

        // --- Condition to run the function ---
        // Run only if the status has just been changed TO 'completed'.
        if (newData.status === 'completed' && oldData.status !== 'completed') {
            
            const influencerId = newData.influencerId;
            const budget = Number(newData.budget) || 0;

            if (!influencerId || budget <= 0) {
                console.error(`Missing influencerId or budget for work ${workId}. Aborting.`);
                return null;
            }

            const profit = budget * 0.90; // Calculate 90% profit
            console.log(`Work ${workId} completed. Influencer: ${influencerId}, Profit to add: ${profit}.`);

            // Get a reference to the influencer's document.
            const influencerRef = db.doc(`users/${influencerId}`);
            
            // --- Transaction to safely update the balance ---
            try {
                await db.runTransaction(async (transaction) => {
                    const influencerDoc = await transaction.get(influencerRef);

                    if (!influencerDoc.exists) {
                        throw new Error(`Influencer document with ID ${influencerId} does not exist!`);
                    }

                    // --- THIS IS THE KEY FIX ---
                    // Ensure we are reading from and writing to the correct balance field.
                    // Let's assume the field name is 'influencerBalance'.
                    // If you used 'affiliateBalance' everywhere, change it here.
                    const currentBalance = influencerDoc.data().influencerBalance || 0;
                    const newBalance = currentBalance + profit;
                    
                    console.log(`Updating balance for user ${influencerId}. Old Balance: ${currentBalance}, New Balance: ${newBalance}.`);
                    
                    // Update the correct balance field in the transaction.
                    transaction.update(influencerRef, { influencerBalance: newBalance });
                    // -------------------------
                });
                
                console.log(`Transaction successful. Balance updated for ${influencerId}.`);
                return null;

            } catch (error) {
                console.error(`Transaction failed for work ${workId}:`, error);
                return null;
            }
        }
        
        console.log("Conditions not met (status not changed to 'completed'). No action taken.");
        return null;
    });
