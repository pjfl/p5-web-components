package Web::Components::ReverseMap;

use mro;

use List::Util        qw( pairs );
use Scalar::Util      qw( blessed );
use Unexpected::Types qw( HashRef );
use Moo::Role;

has 'action_path_map' => is => 'ro', isa => HashRef, default => sub { {} };

sub BUILD {}

after 'BUILD' => sub {
   my $self  = shift;
   my $class = blessed $self;

   for my $pair (pairs $self->dispatch_request) {
      my @parts  = split m{ / }mx, $pair->value->()->[0];
      my $action = $parts[0] . '/' . $parts[-1];
      my ($uri)  = $pair->key =~ m{ [\+] \s* / ([^\+]+) }mx;

      next unless $uri;

      $uri =~ s{ [ ]+ \z }{}mx;
      $uri = [ split m{ \s+? \| \s+? /? }mx, $uri ] if $uri =~ m{ \| }mx;

      $self->action_path_map->{$action} = $uri;
   }

   $self->log->warn("No routes found in ${class}")
      unless scalar keys %{$self->action_path_map};

   return;
};

use namespace::autoclean;

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::ReverseMap - Creates a reverse routing map

=head1 Synopsis

   with 'Web::Components::ReverseMap';

=head1 Description

Creates a reverse routing map

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=item action_path_map

A reverse map of routes regexed out of the controller source

=back

=head1 Subroutines/Methods

Defines the following methods;

=over 3

=item BUILD

Modifies build creating the reverse map after the controller instantiates

=back

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<Web::Components::Role>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <lazarus@roxsoft.co.uk> >>

=head1 License and Copyright

Copyright (c) 2023 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
