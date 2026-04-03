import { Redirect } from 'expo-router';

/** @deprecated Dùng /(pos)/employees/add */
export default function AddEmployeeRedirect() {
  return <Redirect href="/(pos)/employees/add" />;
}
