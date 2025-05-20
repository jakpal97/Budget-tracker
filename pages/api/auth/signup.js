import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../lib/db';
import User from '../../../models/User';
import Category from '../../../models/Category';

export default async function handler(req, res) {
  // Obsługujemy tylko metodę POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metoda niedozwolona' });
  }

  try {
    const { name, email, password } = req.body;

    // Sprawdzamy, czy wszystkie pola są uzupełnione
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Wszystkie pola są wymagane' });
    }

    // Walidacja emaila za pomocą wyrażenia regularnego
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Niepoprawny format adresu email' });
    }

    // Walidacja długości hasła
    if (password.length < 8) {
      return res.status(400).json({ message: 'Hasło musi mieć co najmniej 8 znaków' });
    }

    // Połączenie z bazą danych
    await connectToDatabase();

    // Sprawdzenie, czy użytkownik o podanym emailu już istnieje
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Użytkownik o podanym adresie email już istnieje' });
    }

    // Haszowanie hasła
    const hashedPassword = await bcrypt.hash(password, 12);

    // Utworzenie nowego użytkownika
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    // Zapisanie użytkownika w bazie danych
    const result = await user.save();

    // Tworzenie domyślnych kategorii dla nowego użytkownika
    await Category.createDefaultCategories(result._id);

    // Usuwamy hasło z odpowiedzi
    const newUser = {
      id: result._id.toString(),
      name: result.name,
      email: result.email,
    };

    // Zwracamy status 201 (Created) i dane nowego użytkownika
    return res.status(201).json({
      message: 'Konto zostało utworzone pomyślnie',
      user: newUser,
    });
  } catch (error) {
    console.error('Błąd podczas rejestracji użytkownika:', error);
    return res.status(500).json({ message: 'Wystąpił błąd serwera' });
  }
}