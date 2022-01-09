import { gql } from '@apollo/client/core';

// get discussion by ID
export const GET_DISCUSSION = gql`
  query getDiscussion($id: ID!) {
    getDiscussion(id: $id) {
      id
      title
      body
      createdDate
      editedDate
      Author {
        username
      }
      Channels {
        url
      }
      Tags {
        text
      }
    }
  }
`;

// Get all discussion IDs in channel
// Gets IDs of discussions just so they can be
// deleted when a channel is deleted. This query
// is needed because you can't cascade delete channels.
export const GET_DISCUSSION_IDS_IN_CHANNEL = gql`
  query getDiscussionIdsInChannel($url: String!) {
    getChannel(url: $url) {
      url
      Discussions {
        id
      }
    }
  }
`;

// Get all discussions in a channel
export const GET_DISCUSSIONS_IN_CHANNEL = gql`
  query getDiscussionsInChannel($url: String!) {
    getChannel (url: $url) {
      url
      Discussions {
        id
        title
        body
        Channels {
          url
        }
        Author {
          username
        }
        Tags {
          text
        }
        createdDate
        CommentSections {
          CommentsAggregate {
            count
          }
        }
      }
    }
  }
`;
