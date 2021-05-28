const chance = require('chance').Chance();
const given = require('../../steps/given');
const when = require('../../steps/when');

describe('Given two authenticated users', () => {
  let userA, userB;

  beforeAll(async () => {
    userA = await given.an_authenticated_user();
    userB = await given.an_authenticated_user();
  });

  describe('When user A sends a DM to user B', () => {
    let conversation;
    const message = chance.string({ length: 16 });

    beforeAll(async () => {
      conversation = await when.a_user_calls_sendDirectMessage(
        userA,
        userB.username,
        message
      );
    });

    it("The conversation's lastMessage should be user A's message", () => {
      expect(conversation.lastMessage).toEqual(message);
    });

    it('User A should see the conversation when he calls listConversations', async () => {
      const { conversations, nextToken } = await when.a_user_calls_listConversations(
        userA,
        10
      );

      expect(nextToken).toBeNull();
      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toEqual(conversation);
    });

    it('User B should see the conversation when he calls listConversations', async () => {
      const { conversations, nextToken } = await when.a_user_calls_listConversations(
        userB,
        10
      );

      expect(nextToken).toBeNull();
      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toMatchObject({
        id: conversation.id,
        lastMessage: message,
        lastModified: conversation.lastModified,
        otherUser: {
          id: userA.username,
        },
      });
    });
  });
});