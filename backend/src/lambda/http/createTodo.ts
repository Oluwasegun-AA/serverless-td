import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import 'source-map-support/register'
import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { CreateTodoRequest } from '../../requests/CreateTodoRequest'
import { getUserId } from '../utils';
import { createTodo } from '../../businessLogic/todos'

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = getUserId(event);
    const newTodo: CreateTodoRequest = JSON.parse(event.body);
    const todoId = await createTodo(userId, newTodo);
    // TODO: Implement creating a new TODO item

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        item:
        {
          todoId: todoId,
          ...newTodo
        }
      })
    };
  }
);

handler.use(
  cors({
    credentials: true
  })
)
