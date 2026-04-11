export default {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        const ROLE_NEWBIE = '1492379204510158908';
        const ROLE_MEMBER = '1490204502618411048';

        // Check if they JUST gained the Member role
        const gainedMember = !oldMember.roles.cache.has(ROLE_MEMBER) && newMember.roles.cache.has(ROLE_MEMBER);

        if (gainedMember) {
            // Check if they still have the Newbie role to remove it
            if (newMember.roles.cache.has(ROLE_NEWBIE)) {
                await newMember.roles.remove(ROLE_NEWBIE)
                    .then(() => console.log(`Successfully swapped Newbie for Member for ${newMember.user.username}`))
                    .catch(err => console.error("Failed to remove Newbie role after level up:", err));
            }
        }
    },
};

