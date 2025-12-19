export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    username: string;
    role: string;
    location_id?: string;
  };
}



