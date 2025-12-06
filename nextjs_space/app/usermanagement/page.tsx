'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, Key, Shield, ShieldCheck, Search, X, UserX, UserCheck, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LoadingState, ErrorState } from '@/components/page-states';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  deactivatedAt: string | null;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Deactivation modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  
  // Collapsed state for inactive users
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    if (userRole !== 'ADMIN') {
      router.push('/');
      return;
    }

    loadUsers();
  }, [session, status, userRole, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Benutzer');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalOpen(true);
  };

  const handlePasswordChange = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 6) {
      toast({
        title: 'Fehler',
        description: 'Das Passwort muss mindestens 6 Zeichen lang sein',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Fehler',
        description: 'Die Passwörter stimmen nicht überein',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Ändern des Passworts');
      }

      toast({
        title: 'Erfolg',
        description: `Passwort für ${selectedUser.name || selectedUser.email} wurde geändert`,
      });
      setPasswordModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (user: User, newStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Ändern des Status');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      setDeactivateModalOpen(false);
      setUserToDeactivate(null);
      
      toast({
        title: 'Erfolg',
        description: newStatus 
          ? `${user.name || user.email} wurde reaktiviert`
          : `${user.name || user.email} wurde deaktiviert`,
      });
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const openDeactivateModal = (user: User) => {
    setUserToDeactivate(user);
    setDeactivateModalOpen(true);
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Ändern der Rolle');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      
      toast({
        title: 'Erfolg',
        description: `Rolle wurde geändert`,
      });
    } catch (err: any) {
      toast({
        title: 'Fehler',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const activeUsers = filteredUsers.filter(u => u.isActive);
  const inactiveUsers = filteredUsers.filter(u => !u.isActive);

  if (status === 'loading' || loading) {
    return <LoadingState message="Benutzer werden geladen..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadUsers} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Benutzerverwaltung</h1>
          </div>
          <p className="text-gray-600">Verwalten Sie Benutzer und setzen Sie Passwörter</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Benutzer</CardTitle>
            <CardDescription>
              {users.filter(u => u.isActive).length} aktive Benutzer, {users.filter(u => !u.isActive).length} inaktiv
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Benutzer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Aktive Benutzer */}
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-blue-500 to-cyan-500">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.name || 'Kein Name'}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? (
                        <ShieldCheck className="w-3 h-3 mr-1" />
                      ) : (
                        <Shield className="w-3 h-3 mr-1" />
                      )}
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(value: 'USER' | 'ADMIN') => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordModal(user)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Passwort
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeactivateModal(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Deaktivieren
                    </Button>
                  </div>
                </div>
              ))}
              {activeUsers.length === 0 && !searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  Keine aktiven Benutzer
                </div>
              )}
            </div>

            {/* Inaktive Benutzer (einklappbar) */}
            {inactiveUsers.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowInactiveUsers(!showInactiveUsers)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-left"
                >
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showInactiveUsers ? 'rotate-180' : ''}`} />
                  <UserX className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    Inaktive Mitglieder ({inactiveUsers.length})
                  </span>
                </button>
                
                {showInactiveUsers && (
                  <div className="mt-3 space-y-3">
                    {inactiveUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 rounded-lg transition-colors bg-red-50 hover:bg-red-100 opacity-75"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold bg-gray-400">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-500">
                              {user.name || 'Kein Name'}
                              <span className="ml-2 text-xs text-red-600">(Inaktiv)</span>
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <Badge variant="secondary">
                            {user.role === 'ADMIN' ? (
                              <ShieldCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <Shield className="w-3 h-3 mr-1" />
                            )}
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(user, true)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Reaktivieren
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {filteredUsers.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                Keine Benutzer gefunden
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
            <DialogDescription>
              Neues Passwort für {selectedUser?.name || selectedUser?.email} setzen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordModalOpen(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={handlePasswordChange} disabled={saving}>
              {saving ? 'Speichern...' : 'Passwort setzen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Modal */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer deaktivieren</DialogTitle>
            <DialogDescription>
              Möchten Sie <strong>{userToDeactivate?.name || userToDeactivate?.email}</strong> wirklich deaktivieren?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium mb-2">Hinweis:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Der Benutzer kann sich nicht mehr anmelden</li>
                <li>Bestehende Buchungen, Fahrten und Zahlungen bleiben erhalten</li>
                <li>Der Benutzer wird als &quot;Inaktives Mitglied&quot; angezeigt</li>
                <li>Sie können den Benutzer jederzeit wieder reaktivieren</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateModalOpen(false);
                setUserToDeactivate(null);
              }}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive"
              onClick={() => userToDeactivate && handleStatusChange(userToDeactivate, false)}
            >
              <UserX className="w-4 h-4 mr-2" />
              Deaktivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
