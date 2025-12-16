import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  // En producción, aceptar peticiones desde cualquier origen (Nginx maneja el routing)
  // En desarrollo, usar la URL específica del frontend
  const corsOrigin = process.env.NODE_ENV === 'production' 
    ? true // Aceptar cualquier origen en producción (Nginx reverse proxy)
    : (process.env.FRONTEND_URL || 'http://localhost:3001');
  
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();


