package Web::Components::ReverseMap;

use mro;

use English           qw( -no_match_vars );
use File::Spec        qw( );
use Scalar::Util      qw( blessed );
use Unexpected::Types qw( HashRef );
use Moo::Role;

has 'action_path_map' => is => 'ro', isa => HashRef, default => sub { {} };

sub _read_all_from ($) {
   my $path = shift;

   open my $fh, '<', $path or die "Path ${path} cannot open: ${OS_ERROR}";

   local $RS = undef; my $content = <$fh>; close $fh;

   return $content;
}

sub _reverse_map ($) {
   my $line = shift;

   my ($route, $action) = $line =~ m{ \' ([^\']+) \' (?:.+) \' ([^\']+) \' }mx;
   my ($uri) = $route =~ m{ [\+] \s* / ([^ \+]+) }mx;

   $uri = [ split m{ \s+? \| \s+? /? }mx, $uri ] if $uri && $uri =~ m{ \| }mx;

   return $uri ? [ $action, $uri ] : undef;
}

sub BUILD {}

after 'BUILD' => sub {
   my $self    = shift;
   my ($class) = grep { m{ ::Controller:: }mx }
                     @{ mro::get_linear_isa(blessed $self) };
   my $sep     = File::Spec->catfile(q(), q());
   (my $file   = "$class.pm") =~ s{::}{$sep}g;
   my $path;

   for my $dir (@INC) {
      my $candidate = "${dir}${sep}${file}";
      if (-f $candidate) { $path = $candidate; last }
   }

   unless ($path) {
      $self->log->error("Cannot find source for ${class}");
      return;
   }

   my @routes = grep { $_ } map { _reverse_map $_ } grep { m{ \s sub \s }mx }
                split m{ \n }mx, _read_all_from $path;

   $self->log->warn("No routes found in ${class}") unless scalar @routes;

   for my $route (@routes) {
      $self->action_path_map->{$route->[0]} = $route->[1];
   }

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
