export default {
    name: 'guildMemberAdd',
    async execute(member) {
        const ROLE_NEWBIE = '1492379204510158908';
        
        try {
            await member.roles.add(ROLE_NEWBIE);
            console.log(`Assigned Newbie role to ${member.user.username}`);
        } catch (error) {
            console.error("Error adding Newbie role on join:", error);
        }
    },
};

